# NightEvent

Nodejs server application to organize and manage geolocalized events. 
The application exposes a collection of api to allow the insertion and the modification of events at specific coordinates. 
All the users around a location will receive a notification when a new event is organized in a specific position.

-Database: MongoDB with Mongoose
  MongoDB: https://www.mongodb.com/
  Mongoose: http://mongoosejs.com/ 

-Other libraries:
  Express: http://expressjs.com/
  Body parser: https://github.com/expressjs/body-parser
  Geo distance: https://www.npmjs.com/package/geolib
  Node GCM: https://github.com/ToothlessGear/node-gcm
