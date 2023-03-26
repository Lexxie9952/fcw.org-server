package org.freeciv.servlet;

import org.freeciv.util.Constants;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Properties;

public class ClientKeyResolver  extends HttpServlet {
    private String googleClientKey;

    public void init(ServletConfig config) throws ServletException {
        super.init(config);

        try {
            Properties prop = new Properties();
            prop.load(getServletContext().getResourceAsStream("/WEB-INF/config.properties"));
            googleClientKey = prop.getProperty("google-signin-client-key");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void doPost(HttpServletRequest request, HttpServletResponse response)
            throws IOException, ServletException {
        try {
            response.getOutputStream().print(googleClientKey.trim());
        }  catch (Exception err) {
            response.setHeader("result", "error");
            err.printStackTrace();
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "BAD Request");
        }
    }
}
