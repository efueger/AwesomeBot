const request = require('request');
const discord = require('discord.js');

let weatherConfig;
const geocodeEndpoint = 'https://maps.googleapis.com/maps/api/geocode/json?key=gkey&address=input';
const darkskyEndpoint = 'https://api.darksky.net/forecast/key/lat,lng';

function fahrenheitToCelcius(degree) {
  return ((degree - 32) * 5 / 9).toFixed(0);
}

module.exports = {
  usage: 'weather <adress> - brings current weather info for given address',

  init: (bot) => {
    weatherConfig = bot.settings.weather;
  },

  run: (bot, message, cmdArgs) => {
    if (!cmdArgs) return true;

    // get geocode info
    let requestURL = geocodeEndpoint
                            .replace('gkey', weatherConfig.geocode_api_key)
                            .replace('input', cmdArgs);
    // do percentage encoding
    requestURL = encodeURI(requestURL);

    request(requestURL, (err, res, bod) => {
      if (err) {
        message.chanel.sendMessage('There was a problem with geocoding request.');
        return;
      }

      const geocodeData = JSON.parse(bod);

      if (geocodeData.status !== 'OK') {
        message.channel.sendMessage(`I'm sorry ${message.author}, your address couldn't be detected.`);
        return;
      }

      const address = geocodeData.results[0].formatted_address;
      const coordinate = geocodeData.results[0].geometry.location;
      // get weather data
      requestURL = darkskyEndpoint
                          .replace('key', weatherConfig.darksky_api_key)
                          .replace('lat', coordinate.lat)
                          .replace('lng', coordinate.lng);

      request(requestURL, (error, response, body) => {
        const weatherData = JSON.parse(body);

        const offset = weatherData.offset;
        const utcTime = weatherData.currently.time;
        // datetime is weird in javascript, please do change this part if you can
        const localTime = new Date(utcTime * 1000);
        localTime.setHours(localTime.getHours() + offset);
        // toGMTString prints out timezone of host so we slice it off
        const dateString = localTime.toGMTString().slice(0, -4);
        const temperatureF = weatherData.currently.temperature.toFixed(0);
        const temperatureC = fahrenheitToCelcius(temperatureF);
        const summary = weatherData.currently.summary;
        const humidity = weatherData.currently.humidity * 100;
        // convert speed to freedom units
        const windSpeed = (weatherData.currently.windSpeed * 1.61).toFixed(0);
        const pressure = weatherData.currently.pressure.toFixed(0);
        const embed = new discord.RichEmbed();
        embed.setColor('#4286f4')
             .setFooter(`Local Time: ${dateString}`)
             .setTitle(`Weather in ${address}`)
             .addField('Summary', summary)
             .addField('Temperature °C', `${temperatureC} °C`, true)
             .addField('Temperature °F', `${temperatureF} °F`, true)
             .addField('Timezone', weatherData.timezone, true)
             .addField('Humidity', `${humidity}%`, true)
             .addField('Wind Speed', `${windSpeed} km/h`, true)
             .addField('Air Pressure', `${pressure} mbar`, true)
             .setDescription(weatherConfig.icons[weatherData.currently.icon]);

        message.channel.sendEmbed(embed);
      });
    });
    return false;
  },
};
