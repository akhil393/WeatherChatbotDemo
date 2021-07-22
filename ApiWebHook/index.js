var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));
var path = require("path");
var server = require('http').createServer(app);
var io = require('socket.io')(server);


//**** Webhook******//

app.post('/webhook', function (req, res) {
	console.log('Received a post request');
	if (!req.body) return res.sendStatus(400)
	res.setHeader('Content-Type', 'application/json');
	console.log('here is the post request from DialogFlow');
	console.log(req.body);
	console.log('Got geo city parameter from DialogFlow ' + req.body.queryResult.parameters['geo-city']);
	var city = req.body.queryResult.parameters['geo-city'];
	var w = getWeather(city);
	let response = " "; //Default response from the webhook to show it’s working
	let responseObj = {
		"fulfillmentText": response,
		"fulfillmentMessages": [{
			"text": {
				"text": [w]
			}
		}],
		"source": ""
	}
	console.log('Here is the response to dialogflow');
	console.log(responseObj);
	return res.json(responseObj);
})

//**** Weather API*****///

var apiKey = process.env.API_KEY;
var result = undefined;

function parseResponse(err, response, body) {
	if (err) {
		console.log('error:', error);
	}
	var weather = JSON.parse(body)
	if (weather.message === 'city not found') {
		result = 'Unable to get weather ' + weather.message;
	} else {
		result = 'Right now its ' + weather.main.temp + ' degrees with ' + weather.weather[0].description;
	}
}

function getWeather(city) {
	var url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=imperial&appid=${apiKey}`;
	var req = request(url, parseResponse);
	while (result === undefined) {
		require('deasync').runLoopOnce();
	}
	return result;
}

///*** Demo how Weather api works *******///

app.get('/', function (req, res) {
	res.sendFile(path.join(__dirname, '/index.html'));
})
io.on('connection', function (client) {
	console.log('Socket connection established');
	client.on('SendLocation',
		function (data) {
			console.log('Location received');
			console.log(data);
			var w = getWeather(data);
			console.log(w);
			client.emit('weather', w);
		}
	);
});


server.listen(process.env.PORT || 3000, function () {
	console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});