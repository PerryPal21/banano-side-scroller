'use strict';
// libraries

// modules
const randomUtil = require('./random-util.js');
const dateUtil = require('./date-util.js');
const httpsUtil = require('./https-util.js');

// constants
const MIN_ANSWERS = 1;
const MAX_ANSWERS = 100;
const answers = [];
const registeredSites = new Map();

// variables
/* eslint-disable no-unused-vars */
let config;
let loggingUtil;
/* eslint-enable no-unused-vars */

// functions
const init = (_config, _loggingUtil) => {
  if (_config === undefined) {
    throw new Error('config is required.');
  }
  if (_loggingUtil === undefined) {
    throw new Error('loggingUtil is required.');
  }
  config = _config;
  loggingUtil = _loggingUtil;

  setImmediate(updateAnswers);
  setInterval(updateAnswers, 60000);
};

const deactivate = () => {
  config = undefined;
  loggingUtil = undefined;
  registeredSites.clear();
};

const register = async (req, res) => {
  const secretKey = randomUtil.getRandomHex32();
  const response = {};
  response.secretKey = secretKey;
  const site = {};
  site.lastMs = Date.now();
  registeredSites.set(secretKey, site);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(response));
};

const verify = async (req, res, callback) => {
  const secretKey = req.body.secretKey;
  const actualAnswer = req.body.answer;
  const response = {};
  response.success = false;
  response.challenge_ts = dateUtil.getDate();
  if (registeredSites.has(secretKey)) {
    const site = registeredSites.get(secretKey);
    if (site.answer) {
      const expectedAnswer = site.answer.answer;
      response.success = expectedAnswer == actualAnswer;
      response.message = 'you answered ' + actualAnswer + ' and the correct one was ' + expectedAnswer;
    }
    delete site.answer;
  }
  callback(response.success);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(response));
};

const captcha = async (req, res) => {
  const secretKey = req.body.secretKey;
  const response = {};
  response.success = false;
  response.images = [];
  if (registeredSites.has(secretKey)) {
    const site = registeredSites.get(secretKey);
    site.answer = randomUtil.getRandomArrayElt(answers);

    if (site.answer) {
      response.success = true;
      response.images = site.answer.data;
    } else {
      response.success = false;
    }
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(response));
};

const updateAnswers = async () => {
  let requestedAlready = false;
  while (answers.length < MIN_ANSWERS) {
    const answer = await httpsUtil.sendRequest(config.blackMonkeyDataUrl, 'GET');
    answers.push(answer);
    requestedAlready = true;
  }
  if (!requestedAlready) {
    if (answers.length < MAX_ANSWERS) {
      const answer = await httpsUtil.sendRequest(config.blackMonkeyDataUrl, 'GET');
      answers.push(answer);
    }
  }
};

exports.init = init;
exports.deactivate = deactivate;
exports.register = register;
exports.verify = verify;
exports.captcha = captcha;
