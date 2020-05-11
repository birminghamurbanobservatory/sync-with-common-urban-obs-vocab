//-------------------------------------------------
// Dependencies
//-------------------------------------------------
import {config} from './config';
import * as logger from 'node-logger';
const appName = require('../package.json').name; // Annoyingly if i use import here, the built app doesn't update.
import {getCorrelationId} from './utils/correlator';
import {initialiseEvents} from './events/initialise-events';
import {syncVocab} from './synchronise/synchroniser';


//-------------------------------------------------
// Logging
//-------------------------------------------------
logger.configure(Object.assign({}, config.logger, {getCorrelationId}));


//-------------------------------------------------
// Sync Vocab
//-------------------------------------------------
logger.info(`Running ${appName} now (${new Date().toISOString()})`);
logger.debug(`Vocab URL: ${config.vocab.url}`);


(async (): Promise<void> => {

  try {
    await initialiseEvents({
      url: config.events.url,
      appName,
      logLevel: config.events.logLevel
    });
  } catch (err) {
    logger.error('There was an issue whilst initialising event stream.', err);
  }

  
  try {
    await syncVocab(config.vocab.url);
    logger.debug('Synchronisation finished');
  } catch (err) {
    logger.error(`Failed to sync vocab (${err.message}).`, err);
    // TODO: Is there benefit in exiting with process.exit(1) when it fails? I.e. does this mean kubernetes will mark it as a failure.
  }


  // Exit
  logger.debug('Exiting now');
  process.exit(0);


})();
