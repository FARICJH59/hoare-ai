'use strict';

/**
 * SDK Entry Point
 *
 * Exports all public SDK classes and singletons.
 */

const { HoareClient }    = require('./js-sdk');
const { RestClient }     = require('./rest-client');

module.exports = { HoareClient, RestClient };
