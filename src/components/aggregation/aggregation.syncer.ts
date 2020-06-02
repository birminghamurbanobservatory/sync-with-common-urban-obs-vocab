import {getVocab, resultsToLogMessage, stripPrefixFromId} from '../../synchronise/sync.helpers';
import {config} from '../../config';
import * as logger from 'node-logger';
import {getAggregation, updateAggregation, createAggregation} from './aggregation.service';
import {pick, isEqual} from 'lodash';
import * as Promise from 'bluebird';
import * as joi from '@hapi/joi';


const vocabAggregationSchema = joi.object({
  '@id': joi.string().required(),
  '@type': joi.string().valid('uo:Aggregation').required(),
  label: joi.string().required(),
  description: joi.string(),
  term_status: joi.string()
})
.unknown() // we'll allow extra properties so we don't error everytime someone else decides to add some strange new property
.required();



export async function syncAggregations(): Promise<void> {

  const url = `${config.vocab.baseUrl}/aggregations.json`;
  const vocab = await getVocab(url);
  const definitions = vocab.defines;

  const results = await Promise.map(definitions, async (definition) => {
    try {
      // First check it is valid
      const {error: err} = vocabAggregationSchema.validate(definition);
      if (err) throw err;
      // The parse it
      const parsed = parseAggregation(definition);
      // Then sync it
      const result = await syncAggregation(parsed);
      return result;
    } catch (err) {
      logger.error(`Failed to sync aggregation '${definition.id}' (${err.message})`);
      return 'failed';
    }
  });

  logger.info(`Aggregations. ${resultsToLogMessage(results)}`);

  return;

}


function parseAggregation(aggregation: any): any {
  const parsed: any = {
    id: stripPrefixFromId(aggregation['@id']),
    label: aggregation.label,
    description: aggregation.description || '',
    listed: true,
    inCommonVocab: true
  };
  return parsed;
}


async function syncAggregation(aggregation: any): Promise<string> {

  // First let's see if it already exists
  let current;
  try {
    current = await getAggregation(aggregation.id);
  } catch (err) {
    if (err.name !== 'AggregationNotFound') throw err;
  }

  if (current) {

    // Has there been any updates?
    const comparableKeys = ['label', 'symbol', 'description'];
    const comparableNew = pick(aggregation, comparableKeys);
    const comparableCurrent = pick(current, comparableKeys);
    if (isEqual(comparableCurrent, comparableNew)) {
      return 'unchanged';

    } else {
      // Update it
      logger.debug(`Aggregation '${aggregation.id}' no longer exactly matches the vocab definition, and therefore needs updating.`, {
        uoVersion: comparableNew,
        buoVersion: comparableCurrent
      });
      const updates = comparableNew;
      await updateAggregation(aggregation.id, updates);
      return 'updated';

    }

  } else {
    // Create new record
    await createAggregation(aggregation);
    return 'created';
  }

}