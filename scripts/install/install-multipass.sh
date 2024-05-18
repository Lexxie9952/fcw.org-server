#!/bin/bash

set -e

base_dir="$(pwd)"
TOMCAT_VERSION=8
TOMCAT_HOME="/var/lib/tomcat${TOMCAT_VERSION}"
NODE_VERSION=16

handle_error () {
  local status=${1:-1}
  local msg=${2:-Unknown Error}
  local stars=$(printf '%*s' ${#msg} '')
  >&2 echo
  >&2 echo "${stars// /*}"
  >&2 echo "${msg}"
  >&2 echo "${stars// /*}"
  >&2 echo
  exit 1
}

prepare_configs() {
  echo "Preparing configs"
  [[ ! -f "${base_dir}/config/config" ]] && cp -f "${base_dir}/config/config"{.dist,}
  [[ ! -f "${base_dir}/publite2/settings.ini" ]] && cp -f "${base_dir}/publite2/settings.ini"{.dist,}
  echo "Config files in place"
}

node_repo() {
  if [[ "${NODE_VERSION}" == "14" ]]; then
    curl -LOsS 'https://deb.nodesource.com/setup_14.x' | sudo bash -
  else
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_VERSION}.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
  fi
}

add_repositories() {
  echo "Adding repositories "
  sudo apt-get -y update \
    && sudo apt-get -y install ca-certificates curl gnupg software-properties-common \
    && sudo add-apt-repository -y ppa:openjdk-r/ppa \
    && sudo add-apt-repository -y ppa:deadsnakes/ppa \
    && node_repo \
    && sudo apt-get -y update
}

install_node_packages() {
   sudo -H npm install handlebars@4.5.3 -g
}

install_python_modules() {
  virtualenv -p /usr/bin/python3.7 "${HOME}/.freeciv-env"
  source "${HOME}/.freeciv-env/bin/activate"
  pip install -r "${base_dir}/requirements.txt"
}

install_dependencies() {
  sudo apt-get -y install \
    acl \
    autoconf \
    automake \
    autotools-dev \
    curl \
    git \
    gnupg \
    imagemagick \
    libbz2-dev \
    libcurl4-openssl-dev \
    libicu-dev \
    libjansson-dev \
    liblzma-dev \
    libmagickcore.*extra \
    libmagickwand-dev \
    libsqlite3-dev \
    libtool \
    make \
    nginx \
    openjdk-11-jdk-headless \
    maven \
    patch \
    pkg-config \
    pngcrush \
    procps \
    python3.7 \
    python3.7-dev \
    build-essential \
    virtualenv \
    sed \
    swapspace \
    tar \
    unzip \
    zlib1g-dev \
    software-properties-common \
    tomcat8 \
    tomcat8-admin \
    xvfb \
    libodbc1 \
    unixodbc \
    nodejs \
    && install_node_packages \
    && install_python_modules
}

configure_mysql() {
  sudo apt-get -y install default-mysql-server \
    && sudo debconf-set-selections <<< "mysql-server mysql-server/root_password password ${DB_ROOT_PASSWORD}" \
    && sudo debconf-set-selections <<< "mysql-server mysql-server/root_password_again password ${DB_ROOT_PASSWORD}" \
    && sudo systemctl start mysql || handle_error 31 "Failed to start mysql"

    sudo mysqladmin -u root -p"${DB_ROOT_PASSWORD}" create "${DB_NAME}" || handle_error 32 "Failed to create database"

    sudo mysql -u root -p"${DB_ROOT_PASSWORD}" << EOF
CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}',
            '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD}',
            '${DB_USER}'@'::1'       IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL ON ${DB_NAME}.* TO '${DB_USER}'@'localhost',
                             '${DB_USER}'@'127.0.0.1',
                             '${DB_USER}'@'::1';
EOF
}

configure_tomcat() {
  pushd "${TOMCAT_HOME}" \
    && sudo setfacl -m d:u:$(id -u):rwX,u:$(id -u):rwx webapps \
    && mkdir -p webapps/data/{savegames/pbem,scorelogs,ranklogs} \
    && setfacl -Rm d:u:tomcat8:rwX webapps/data \
    && popd
}

build_freeciv() {
  pushd ${base_dir}/freeciv \
    && ./prepare_freeciv.sh \
    && pushd build \
    && make install \
    && popd && popd
}

run_migration_scripts() {
  pushd "${base_dir}/scripts/migration" \
  && mig_scripts=([0-9]*) \
  && echo "${mig_scripts[-1]}" > checkpoint \
  && popd
}

generate_from_templates() {
  "${base_dir}/config/gen-from-templates.sh"
}

sync_js() {
  mkdir -p "${base_dir}/freeciv-web/src/derived/webapp" \
    && "${base_dir}/scripts/sync-js-hand.sh" \
        -f "${base_dir}/freeciv/freeciv" \
        -i "${HOME}/freeciv" \
        -o "${base_dir}/freeciv-web/src/derived/webapp" \
        -d "${TOMCAT_HOME}/webapps/data"
}

build_freeciv_web() {
  pushd "${base_dir}/freeciv-web" || exit 1
  chmod +x *.sh
  ./buildrules.sh || exit 1
  ./cleanrules.sh || exit 1
  ./build.sh -B || exit 1
  popd || exit 1

}

create_start_stop_scripts() {
  pushd "${base_dir}/scripts" || exit 1
  cat <<EOM > "dependency-services-start.sh"
#!/bin/bash

sudo systemctl reload nginx.service || sudo systemctl start nginx.service
sudo systemctl is-active --quiet mysql.service || sudo systemctl start mysql.service
sudo systemctl is-active --quiet tomcat8.service || sudo systemctl start tomcat8.service
EOM
  chmod +x dependency-services-start.sh

cat <<EOM > "dependency-services-stop.sh"
#!/bin/bash

sudo systemctl is-active --quiet  nginx.service || sudo systemctl reload nginx.service
sudo systemctl is-active --quiet tomcat8.service || sudo systemctl stop tomcat8.service
EOM

  chmod +x dependency-services-stop.sh
  popd || exit 1
}

setup_nginx() {
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo cp -R "${base_dir}/nginx" /etc/
  sudo mkdir -p /etc/nginx/ssl/private
  sudo chmod 700 /etc/nginx/ssl/private
  openssl req -x509 -newkey rsa:2048 -keyout freeciv-web.key -out freeciv-web.crt -days 3650 -nodes -subj '/CN=localhost' -batch
  sudo mv freeciv-web.crt /etc/nginx/ssl/
  sudo mv freeciv-web.key /etc/nginx/ssl/private/
}

docker_install() {
  echo "======= [Starting installation for docker] ========"
  prepare_configs
  . "${base_dir}/config/config"
  add_repositories \
      && install_dependencies \
      && generate_from_templates \
      && configure_tomcat \
      && build_freeciv \
      && run_migration_scripts \
      && sync_js
  echo "========= [Docker installation complete] =========="
}

bionic_install() {
  echo "======= [Starting installation for ubuntu-bionic] ========"
  prepare_configs
  . "${base_dir}/config/config"
  add_repositories || handle_error 1 "Failed to add repositories"
  install_dependencies || handle_error 2 "Failed to install packages"
  configure_mysql || handle_error 3 "Failed to configure mysql"
  configure_tomcat || handle_error 4 "Failed to configure tomcat"
  build_freeciv  || handle_error 5 "Failed to build freeciv"
  generate_from_templates  || handle_error 7 "Failed to generate templates"
  run_migration_scripts || handle_error 6 "Failed to run migration scripts"
  sync_js || handle_error 8 "Failed to sync js"
  build_freeciv_web || handle_error 9 "Failed to build freeciv web"
  setup_nginx || handle_error 9 "Failed to setup nginx"
  create_start_stop_scripts || handle_error 10 "Failed to create Start/Stop scripts"
  cp "${HOME}/freeciv-web/multipass-entrypoint.sh" "${HOME}/multipass-entrypoint.sh"
  chmod +x "${HOME}/multipass-entrypoint.sh"
  echo "========= [ubuntu-bionic installation complete] =========="
}


installation_type="${1:-}"
case "${installlation_type}" in
docker)
  docker_install
  ;;
bionic)
  bionic_install
  ;;
*)
  bionic_install
esac

exit 0
