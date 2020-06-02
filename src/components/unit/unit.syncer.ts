import {getVocab, resultsToLogMessage, stripPrefixFromId, nullPropertiesIfMissing} from '../../synchronise/sync.helpers';
import {config} from '../../config';
import * as logger from 'node-logger';
import {pick, isEqual} from 'lodash';
import * as Promise from 'bluebird';
import * as joi from '@hapi/joi';
import {getUnit, updateUnit, createUnit} from './unit.service';


const vocabUnitSchema = joi.object({
  '@id': joi.string().required(),
  '@type': joi.string().valid('uo:Unit').required(),
  label: joi.string().required(),
  symbol: joi.string(),
  description: joi.string(),
  sameAs: joi.array().items(joi.string()),
  term_status: joi.string()
})
.unknown() // we'll allow extra properties so we don't error everytime someone else decides to add some strange new property
.required();


export async function syncUnits(): Promise<void> {

  const url = `${config.vocab.baseUrl}/units.json`;
  const vocab = await getVocab(url);
  const definitions = vocab.defines;

  const results = await Promise.map(definitions, async (definition) => {
    try {
      // First check it is valid
      const {error: err} = vocabUnitSchema.validate(definition);
      if (err) throw err;
      // The parse it
      const parsed = parseUnit(definition);
      // Then sync it
      const result = await syncUnit(parsed);
      return result;
    } catch (err) {
      logger.error(`Failed to sync unit '${definition.id}' (${err.message})`);
      return 'failed';
    }
  });

  logger.info(`Units. ${resultsToLogMessage(results)}`);

  return;

}


function parseUnit(unit: any): any {
  const parsed: any = {
    id: stripPrefixFromId(unit['@id']),
    label: unit.label,
    description: unit.description || '',
    listed: true,
    inCommonVocab: true
  };
  if (unit.symbol) {
    parsed.symbol = unit.symbol;
  }
  return parsed;
}


async function syncUnit(unit: any): Promise<string> {

  // First let's see if it already exists
  let current;
  try {
    current = await getUnit(unit.id);
  } catch (err) {
    if (err.name !== 'UnitNotFound') throw err;
  }

  if (current) {

    // Has there been any updates?
    const comparableKeys = ['label', 'symbol', 'description'];
    const comparableNew = pick(unit, comparableKeys);
    const comparableCurrent = pick(current, comparableKeys);
    if (isEqual(comparableCurrent, comparableNew)) {
      return 'unchanged';

    } else {
      // Update it
      logger.debug(`Unit '${unit.id}' no longer exactly matches the vocab definition, and therefore needs updating.`, {
        uoVersion: comparableNew,
        buoVersion: comparableCurrent
      });
      const updates = nullPropertiesIfMissing(comparableNew, ['symbol']);
      await updateUnit(unit.id, updates);
      return 'updated';

    }

  } else {
    // Create new record
    await createUnit(unit);
    return 'created';
  }

}






