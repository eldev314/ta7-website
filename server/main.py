''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''
# Necessary Imports
from fastapi import FastAPI, Request, Response    # The main FastAPI import and Request/Response objects
from fastapi.responses import RedirectResponse    # Used to redirect to another route
from pydantic import BaseModel                    # Used to define the model matching the DB Schema
from fastapi.responses import HTMLResponse        # Used for returning HTML responses (JSON is default)
from fastapi.templating import Jinja2Templates    # Used for generating HTML from templatized files
from fastapi.staticfiles import StaticFiles       # Used for making static resources available to server
import uvicorn                                    # Used for running the app directly through Python
import dbutils as db                              # Import helper module of database functions!

# Import the necessary libraries
import requests
from fastapi import HTTPException

''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''
# Configuration
app = FastAPI()                                   # Specify the "app" that will run the routing
views = Jinja2Templates(directory='views')        # Specify where the HTML files are located
static_files = StaticFiles(directory='public')    # Specify where the static files are located
app.mount('/public', static_files, name='public') # Mount the static files directory to /public

# Use MySQL for storing session data
from sessiondb import Sessions
sessions = Sessions(db.db_config, expiry=600)

# # Use in-memory dictionary to store session data – CAUTION: all sessions are deleted upon server restart
# from sessiondict import Sessions
# sessions = Sessions(expiry=600)

''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''
# Define a User class that matches the SQL schema we defined for our users
class User(BaseModel):
  first_name: str
  last_name: str
  username: str
  password: str

class Visitor(BaseModel):
  username: str
  password: str

''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''
# A function to authenticate users when trying to login or use protected routes
def authenticate_user(username:str, password:str) -> bool:
  return db.check_user_password(username, password)

''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''
# Authentication routes (login, logout, and a protected route for testing)
@app.get('/login')
def get_login(request:Request) -> HTMLResponse:
  with open("views/login.html") as html:
    return HTMLResponse(content=html.read())

@app.get('/voice', response_class=HTMLResponse)
def get_voice_page(request: Request) -> HTMLResponse:
    session = sessions.get_session(request)
    if len(session) > 0 and session.get('logged_in'):
        with open("views/voice_ai.html") as html:
            return HTMLResponse(content=html.read())
    else:
        not_logged_in_html = """
            <html>
            <head>
                <style>
                    /* Reset default margin and padding */
                    * {
                      margin: 0;
                      padding: 0;
                    }

                    body {
                      background: #f4f4f4; /* Very light gray background */
                      margin: 2rem;
                      color: #333; /* Dark gray text color */
                      font-size: 1.2rem; /* Larger font size */
                      font-family: Arial, sans-serif; /* Use Arial or a sans-serif font */
                    }

                    /* Add other styles from rest.css here */

                </style>
            </head>
            <body>
                <p>You are not logged in. Please <a href="/login">log in</a> to access the voice AI.</p>
            </body>
            </html>
        """
        return HTMLResponse(content=not_logged_in_html)
    
@app.get('/create_user')
def get_create_user(request:Request) -> HTMLResponse:
  with open("views/create_user.html") as html:
    return HTMLResponse(content=html.read())
  
@app.get('/data', response_class=HTMLResponse)
def get_data_page(request: Request) -> HTMLResponse:
    session = sessions.get_session(request)
    if len(session) > 0 and session.get('logged_in'):
        with open("views/data.html") as html:
            return HTMLResponse(content=html.read())
    else:
        not_logged_in_html = """
            <html>
            <head>
                <style>
                    /* Reset default margin and padding */
                    * {
                      margin: 0;
                      padding: 0;
                    }

                    body {
                      background: #f4f4f4; /* Very light gray background */
                      margin: 2rem;
                      color: #333; /* Dark gray text color */
                      font-size: 1.2rem; /* Larger font size */
                      font-family: Arial, sans-serif; /* Use Arial or a sans-serif font */
                    }

                    /* Add other styles from rest.css here */

                </style>
            </head>
            <body>
                <p>You are not logged in. Please <a href="/login">log in</a> to access the data.</p>
            </body>
            </html>
        """
        return HTMLResponse(content=not_logged_in_html)


@app.post('/login')
def post_login(visitor:Visitor, request:Request, response:Response) -> dict:
  username = visitor.username
  password = visitor.password

  # Invalidate previous session if logged in
  session = sessions.get_session(request)
  if len(session) > 0:
    sessions.end_session(request, response)

  # Authenticate the user
  if authenticate_user(username, password):
    session_data = {'username': username, 'logged_in': True}
    session_id = sessions.create_session(response, session_data)
    return {'message': 'Login successful', 'session_id': session_id}
  else:
    return {'message': 'Invalid username or password', 'session_id': 0}

@app.post('/logout')
def post_logout(request:Request, response:Response) -> dict:
  sessions.end_session(request, response)
  return {'message': 'Logout successful', 'session_id': 0}

@app.get('/home', response_class=HTMLResponse)
def get_home(request:Request) -> HTMLResponse:
  session = sessions.get_session(request)
  if len(session) > 0 and session.get('logged_in'):
    session_id = request.cookies.get("session_id")
    template_data = {'request':request, 'session':session, 'session_id':session_id}
    return views.TemplateResponse('home.html', template_data)
  else:
    return RedirectResponse(url="/login", status_code=302)

@app.get('/protected')
def get_protected(request:Request) -> dict:
  session = sessions.get_session(request)
  if len(session) > 0 and session.get('logged_in'):
    return {'message': 'Access granted'}
  else:
    return {'message': 'Access denied'}

# GET /sessions
@app.get('/sessions')
def get_sessions(request:Request) -> dict:
  return sessions.get_session(request)

''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''
# Index route to load the main page in a templatized fashion
# GET /
@app.get('/', response_class=HTMLResponse)
def get_index(request:Request) -> HTMLResponse:
  with open("views/login.html") as html:
    return HTMLResponse(content=html.read())

''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''
# RESTful User Routes

# GET /users
@app.get('/users')
def get_users() -> dict:
  users = db.select_users()
  keys = ['id', 'first_name', 'last_name', 'username']
  users = [dict(zip(keys, user)) for user in users]
  return {"users": users}

# GET /users/{user_id}
@app.get('/users/{user_id}')
def get_user(user_id:int) -> dict:
  user = db.select_users(user_id)
  if user:
    return {'id':user[0], 'first_name':user[1], 'last_name':user[2], 'username':user[3]}
  return {}

# POST /users
# Used to create a new user
@app.post("/users")
def post_user(user:User) -> dict:
  new_id = db.create_user(user.first_name, user.last_name, user.username, user.password)
  return get_user(new_id)

# PUT /users/{user_id}
@app.put('/users/{user_id}')
def put_user(user_id:int, user:User) -> dict:
  return {'success': db.update_user(user_id, user.first_name, user.last_name, user.username, user.password)}

# DELETE /users/{user_id}
@app.delete('/users/{user_id}')
def delete_user(user_id:int) -> dict:
  return {'success': db.delete_user(user_id)}



# Endpoint to query sensor data from the external API
@app.get('/query_sensor_data')
def query_sensor_data(auth: str, userId: str = None, sensorType: str = None):
    # Define the API endpoint for querying sensor data
    api_url = "https://ece140.frosty-sky-f43d.workers.dev/api/query"

    # Prepare the query parameters
    params = {'auth': auth, 'userId': userId, 'sensorType': sensorType}

    try:
        # Make a GET request to the external API
        response = requests.get(api_url, params=params)

        # Check if the request was successful (status code 200)
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 404:
            raise HTTPException(status_code=404, detail="User ID not found in the external database")
        elif response.status_code == 400:
            raise HTTPException(status_code=400, detail="Invalid sensor type")
        elif response.status_code == 500:
            raise HTTPException(status_code=500, detail="Error querying sensor data")
        else:
            raise HTTPException(status_code=500, detail="Unexpected error")

    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Request to external API failed: {str(e)}")


''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''
# If running the server directly from Python as a module
if __name__ == "__main__":
  uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
