/*******************************************************************************
 * Freeciv-web - the web version of Freeciv. http://play.freeciv.org/
 * Copyright (C) 2009-2017 The Freeciv-web project
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *******************************************************************************/
package org.freeciv.servlet;

import org.apache.commons.codec.digest.Crypt;

import java.io.*;
import javax.servlet.*;
import javax.servlet.http.*;

import java.sql.*;
import javax.sql.*;
import javax.naming.*;

import org.freeciv.persistence.DbManager;
import org.apache.commons.codec.digest.DigestUtils;
import org.freeciv.services.Validation;
import org.freeciv.util.Constants;


/**
 * Validates that the given username and password match a user in the database.
 * Such user must be activated.
 *
 * URL: /login_user
 */
public class LoginUser extends HttpServlet {
	
	private static final long serialVersionUID = 1L;

	private final Validation validation = new Validation();

	public void doPost(HttpServletRequest request, HttpServletResponse response)
			throws IOException, ServletException {

		String username = java.net.URLDecoder.decode(request.getParameter("username"), "UTF-8");
		String secure_password = java.net.URLDecoder.decode(request.getParameter("sha_password"), "UTF-8");


		if (secure_password == null || secure_password.length() <= 2) {
			response.sendError(HttpServletResponse.SC_BAD_REQUEST, Constants.ERRMSG_INVALIDPASSWORD_EXTENDED);
			return;
		}
		if (!validation.isValidUsername(username)) {
			response.sendError(HttpServletResponse.SC_BAD_REQUEST, Constants.ERRMSG_INVALIDUSERNAME_EXTENDED);
			return;
		}


		Connection conn = null;
		try {
			Context env = (Context) (new InitialContext().lookup(Constants.JNDI_CONNECTION));
			DataSource ds = (DataSource) env.lookup(Constants.JNDI_DDBBCON_MYSQL);
			conn = ds.getConnection();

			// Salted, hashed password.
			String saltHashQuery = DbManager.getQuerySaltHash();

			PreparedStatement ps1 = conn.prepareStatement(saltHashQuery);
			ps1.setString(1, username);
			ResultSet rs1 = ps1.executeQuery();
			if (!rs1.next()) {
				response.getOutputStream().print("Failed");
			} else {
				String hashedPasswordFromDB = rs1.getString(1);
                                Boolean compat_encrypt = !rs1.getBoolean(2);
                                if (compat_encrypt) {
                                    if (hashedPasswordFromDB != null &&
                                        hashedPasswordFromDB.equals(Crypt.crypt(secure_password, hashedPasswordFromDB))) {
                                        // Login OK!
					response.getOutputStream().print("OK");
                                    } else {
					response.getOutputStream().print("Failed");
                                    }
                                } else {
                                    if (hashedPasswordFromDB != null &&
                                        hashedPasswordFromDB.equals(DigestUtils.sha256Hex(secure_password))) {
					// Login OK!
					response.getOutputStream().print("OK");
                                    } else {
					response.getOutputStream().print("Failed");
                                    }
                                }
			}


		} catch (Exception err) {
			response.setHeader("result", "error");
			err.printStackTrace();
			response.sendError(HttpServletResponse.SC_BAD_REQUEST, Constants.ERRMSG_LOGIN);
		} finally {
			if (conn != null)
				try {
					conn.close();
				} catch (SQLException e) {
					e.printStackTrace();
				}
		}
	}

	public void doGet(HttpServletRequest request, HttpServletResponse response)
			throws IOException, ServletException {

		response.sendError(HttpServletResponse.SC_METHOD_NOT_ALLOWED, Constants.ERRMSG_POST);

	}

}
