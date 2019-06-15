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

import java.util.ArrayList;
import java.util.List;

import java.io.*;
import javax.servlet.*;
import javax.servlet.http.*;

import java.sql.*;
import java.util.Properties;

import javax.sql.*;

import org.apache.commons.codec.digest.Crypt;
import org.apache.commons.io.IOUtils;
import org.apache.http.HttpResponse;
import org.apache.http.NameValuePair;
import org.apache.http.client.HttpClient;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.message.BasicNameValuePair;
import javax.naming.*;

import org.freeciv.persistence.DbManager;
import org.freeciv.services.Validation;
import org.freeciv.util.Constants;


/**
 * Log a cheater.
 *
 * URL: /validate_twit
 */
public class LogCheater extends HttpServlet {
	
	public void doPost(HttpServletRequest request, HttpServletResponse response)
			throws IOException, ServletException {
			
	    response.setHeader("Content-Type", "text/plain");
		String username = request.getParameter("username");	
		String type = request.getParameter("type");	
        String port = request.getParameter("port");
		String ipAddress = request.getHeader("X-Real-IP");        
		
		if (ipAddress == null) {
			ipAddress = request.getRemoteAddr();
		}
		
		Connection conn = null;
		try {
			Thread.sleep(300);

			Context env = (Context) (new InitialContext().lookup(Constants.JNDI_CONNECTION));
			DataSource ds = (DataSource) env.lookup(Constants.JNDI_DDBBCON_MYSQL);
			conn = ds.getConnection();
			String query;
            PreparedStatement preparedStatement;
			
			if (type.equals("type=longturn#")) {
                query = DbManager.getGoogleUserIp();
                preparedStatement = conn.prepareStatement(query);
                preparedStatement.setString(1, username);
                ResultSet rs = preparedStatement.executeQuery();
                String dbIpAddress = "";
                if (rs.next()) {				
                    dbIpAddress =  rs.getString(2);
                    if (dbIpAddress.equals(ipAddress)) {                
                        return;
                    }
                }                                                
			}
			
            query = DbManager.getQueryInsertCheater();
            preparedStatement = conn.prepareStatement(query);
            preparedStatement.setString(1, username.toLowerCase());
            preparedStatement.setString(2, ipAddress);
            preparedStatement.setString(3, type);
            preparedStatement.setString(4, port);
            preparedStatement.executeUpdate();

		} catch (Exception err) {
			response.setHeader("result", "error");
			response.sendError(HttpServletResponse.SC_BAD_REQUEST, Constants.ERRMSG_LOGCHEATER + err);
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
