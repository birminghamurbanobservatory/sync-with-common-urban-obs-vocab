import {getVocab, resultsToLogMessage, stripPrefixFromId} from '../../synchronise/sync.helpers';
import {config} from '../../config';
import * as logger from 'node-logger';
import {pick, isEqual} from 'lodash';
import * as Promise from 'bluebird';
import * as joi from '@hapi/joi';
import {getObservableProperty, updateObservableProperty, createObservableProperty} from './observable-property.service';


export const vocabObservablePropertySchema = joi.object({
  '@id': joi.string().required(),
  '@type': joi.string().valid('uo:ObservableProperty').required(),
  label: joi.string().required(),
  description: joi.string(),
  recommendedUnits: joi.array().items(joi.string()),
  sameAs: joi.array().items(joi.string()),
  term_status: joi.string()
})
.unknown() // we'll allow extra properties so we don't error everytime someone else decides to add some strange new property
.required();


export async function syncObservableProperties(): Promise<void> {

  const url = `${config.vocab.baseUrl}/observable-properties.json`;
  const vocab = await getVocab(url);
  const definitions = vocab.defines;

  const results = await Promise.map(definitions, async (definition) => {
    try {
      // First check it is valid
      const {error: err} = vocabObservablePropertySchema.validate(definition);
      if (err) throw err;
      // The parse it
      const parsed = parseObservableProperty(definition);
      // Then sync it
      const result = await syncObservableProperty(parsed);
      return result;
    } catch (err) {
      logger.error(`Failed to sync observable property '${definition.id}' (${err.message})`);
      return 'failed';
    }
  });

  logger.info(`Observable properties. ${resultsToLogMessage(results)}`);

  return;

}


function parseObservableProperty(observableProperty: any): any {
  const parsed: any = {
    id: stripPrefixFromId(observableProperty['@id']),
    label: observableProperty.label,
    description: observableProperty.description || '',
    listed: true,
    inCommonVocab: true
  };
  if (observableProperty.recommendedUnits) {
    parsed.units = observableProperty.recommendedUnits.map(stripPrefixFromId);
  } else {
    parsed.units = [];
  }
  return parsed;
}


async function syncObservableProperty(observableProperty: any): Promise<string> {

  // First let's see if it already exists
  let current;
  try {
    current = await getObservableProperty(observableProperty.id);
  } catch (err) {
    if (err.name !== 'ObservablePropertyNotFound') throw err;
  }

  if (current) {

    // Has there been any updates?
    const comparableKeys = ['label', 'description', 'units'];
    const comparableNew = pick(observableProperty, comparableKeys);
    const comparableCurrent = pick(current, comparableKeys);
    if (isEqual(comparableCurrent, comparableNew)) {
      return 'unchanged';

    } else {
      // Update it
      logger.debug(`Observable property '${observableProperty.id}' no longer exactly matches the vocab definition, and therefore needs updating.`, {
        uoVersion: comparableNew,
        buoVersion: comparableCurrent
      });
      const updates = comparableNew;
      await updateObservableProperty(observableProperty.id, updates);
      return 'updated';

    }

  } else {
    // Create new record
    await createObservableProperty(observableProperty);
    return 'created';
  }

}




















