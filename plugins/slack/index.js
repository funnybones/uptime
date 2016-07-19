/**
 * Slack plugin
 *
 * Notifies all events (up, down, paused, restarted) by Slack
 *
 * Installation
 * ------------
 * This plugin is disabled by default. To enable it, add its entry
 * to the `plugins` key of the configuration:
 *
 *   // in config/production.yaml
 *   plugins:
 *     - ./plugins/slack
 *
 * Usage
 * -----
 * This plugin sends a slack each time a check is started, goes down, or goes back up.
 * When the check goes down, the slack contains the error details:
 *
 *   Object: [Down] Check "FooBar" just went down
 *   On Thursday, September 4th 1986 8:30 PM,
 *   a test on URL "http://foobar.com" failed with the following error:
 *
 *     Error 500
 *
 * Configuration
 * -------------
 * Here is an example configuration:
 *
 *   // in config/production.yaml
 *   slack:
 *     webHook: 'https://hooks.slack.com/services/123'
 *     channel: '#server-fault'
 *     username: 'ServerBot'
 *     event:
 *       up:        true
 *       down:      true
 *       paused:    false
 *       restarted: false
 */
var fs = require('fs');
var nodemailer = require('nodemailer');
var moment = require('moment');
var CheckEvent = require('../../models/checkEvent');
var Slack = require('node-slack');

exports.initWebApp = function (options) {
    // small message formatter
    function getMessageText(event, check) {
        switch (event.message) {
            case 'down':
                return 'On ' + moment(event.timestamp).format('LLLL') + ' a test on URL' + check.url + ' failed with the following error ' + event.details
            case 'paused':
                return 'On ' + moment(event.timestamp).format('LLLL') + ' ' + check.url + ' was manually paused'
            case 'restarted':
                return 'On ' + moment(event.timestamp).format('LLLL') + ' ' + check.url + ' was manually restarted'
            case 'up':
                if (event.downtime)
                    return 'Check ' + check.name + ' went back up. ' +  'On '  + moment(event.timestamp).format('LLLL') + ' and after ' + moment.duration(event.downtime).humanize() + ' of downtime.'
                else
                    return 'Check ' + check.name + ' is now up. ' + 'On ' + moment(event.timestamp).format('LLLL') + ' a test on URL ' + check.url + ' responded correctly.'
             default:
                return ''
        };

    };
    // get config
    var config = options.config.slack;
    CheckEvent.on('afterInsert', function (checkEvent) {
        if (!config.event[checkEvent.message]) return;
        checkEvent.findCheck(function (err, check) {
            if (err) return console.error(err);
            // config slack
            var slack = new Slack(config.webHook, {});
            // get text message
            var text = getMessageText(checkEvent, check);
            // send message
            slack.send({
                text: text,
                channel: config.channel,
                username: config.username
            }, function (err) {
                if (err)
                    console.log('Error on sending slack \n' + err);
            });
        });
    });
    console.log('Enabled Slack notifications');
};
