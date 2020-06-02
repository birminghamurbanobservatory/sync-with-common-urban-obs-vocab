import {getVocab, resultsToLogMessage, stripPrefixFromId} from '../../synchronise/sync.helpers';
import {config} from '../../config';
import * as logger from 'node-logger';
import {pick, isEqual} from 'lodash';
import * as Promise from 'bluebird';
import * as joi from '@hapi/joi';
import {getFeatureOfInterest, updateFeatureOfInterest, createFeatureOfInterest} from './feature-of-interest.service';


export const vocabFeatureOfInterestSchema = joi.object({
  '@id': joi.string().required(),
  '@type': joi.string().valid('uo:FeatureOfInterest').required(),
  label: joi.string().required(),
  description: joi.string(),
  sameAs: joi.array().items(joi.string()),
  term_status: joi.string()
})
.unknown() // we'll allow extra properties so we don't error everytime someone else decides to add some strange new property
.required();


export async function syncFeaturesOfInterest(): Promise<void> {

  const url = `${config.vocab.baseUrl}/features-of-interest.json`;
  const vocab = await getVocab(url);
  const definitions = vocab.defines;

  const results = await Promise.map(definitions, async (definition) => {
    try {
      // First check it is valid
      const {error: err} = vocabFeatureOfInterestSchema.validate(definition);
      if (err) throw err;
      // The parse it
      const parsed = parseFeatureOfInterest(definition);
      // Then sync it
      const result = await syncFeatureOfInterest(parsed);
      return result;
    } catch (err) {
      logger.error(`Failed to sync feature of interest '${definition.id}' (${err.message})`);
      return 'failed';
    }
  });

  logger.info(`Features of interest. ${resultsToLogMessage(results)}`);

  return;

}


function parseFeatureOfInterest(featureOfInterest: any): any {
  const parsed: any = {
    id: stripPrefixFromId(featureOfInterest['@id']),
    label: featureOfInterest.label,
    description: featureOfInterest.description || '',
    listed: true,
    inCommonVocab: true
  };
  return parsed;
}


async function syncFeatureOfInterest(featureOfInterest: any): Promise<string> {

  // First let's see if it already exists
  let current;
  try {
    current = await getFeatureOfInterest(featureOfInterest.id);
  } catch (err) {
    if (err.name !== 'FeatureOfInterestNotFound') throw err;
  }

  if (current) {

    // Has there been any updates?
    const comparableKeys = ['label', 'description'];
    const comparableNew = pick(featureOfInterest, comparableKeys);
    const comparableCurrent = pick(current, comparableKeys);
    if (isEqual(comparableCurrent, comparableNew)) {
      return 'unchanged';

    } else {
      // Update it
      logger.debug(`Feature of interest '${featureOfInterest.id}' no longer exactly matches the vocab definition, and therefore needs updating.`, {
        uoVersion: comparableNew,
        buoVersion: comparableCurrent
      });
      const updates = comparableNew;
      await updateFeatureOfInterest(featureOfInterest.id, updates);
      return 'updated';

    }

  } else {
    // Create new record
    await createFeatureOfInterest(featureOfInterest);
    return 'created';
  }

}














