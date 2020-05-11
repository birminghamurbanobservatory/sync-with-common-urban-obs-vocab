import axios from 'axios';
import * as logger from 'node-logger';
import * as check from 'check-types';
import {vocabUnitSchema, vocabObservablePropertySchema, vocabDisciplineSchema} from './vocab-schemas';
import * as Promise from 'bluebird';
import {getUnit, updateUnit, createUnit} from '../components/unit/unit.service';
import {isEqual, pick, countBy, cloneDeep} from 'lodash';
import {getDiscipline, updateDiscipline, createDiscipline} from '../components/discipline/discipline.service';
import {getObservableProperty, updateObservableProperty, createObservableProperty} from '../components/observable-property/observable-property.service';


export async function syncVocab(vocabUrl: string): Promise<void> {

  const vocab = await getVocab(vocabUrl);
  const parsed = parseVocab(vocab);

  logger.debug(`The vocab contains ${parsed.units.length} units, ${parsed.disciplines.length} disciplines and ${parsed.observableProperties.length} observable properties.`);

  // units
  const unitResults = await Promise.map(parsed.units, async (unit) => {
    try {
      const result =  await syncUnit(unit);
      return result;
    } catch (err) {
      logger.error(`Failed to sync unit '${unit.id}' (${err.message})`);
      return 'failed';
    }
  });
  logger.info(`UNITS. ${resultsToLogMessage(unitResults)}`);

  // disciplines
  const disciplineResults = await Promise.map(parsed.disciplines, async (discipline) => {
    try {
      const result =  await syncDiscipline(discipline);
      return result;
    } catch (err) {
      logger.error(`Failed to sync discipline '${discipline.id}' (${err.message})`);
      return 'failed';
    }
  });
  logger.info(`DISCIPLINES. ${resultsToLogMessage(disciplineResults)}`);

  // observable properties
  const observablePropertiesResults = await Promise.map(parsed.observableProperties, async (observableProperty) => {
    try {
      const result =  await syncObservableProperty(observableProperty);
      return result;
    } catch (err) {
      logger.error(`Failed to sync observable property '${observableProperty.id}' (${err.message})`);
      return 'failed';
    }
  });
  logger.info(`OBSERVABLE PROPERTIES. ${resultsToLogMessage(observablePropertiesResults)}`);

  return;

}


export function resultsToLogMessage(results): string {

  const counts = countBy(results);
  const msg = `Created: ${counts.created || 0}. Updated: ${counts.updated || 0}. Unchanged: ${counts.unchanged || 0}. Failed: ${counts.failed || 0}`;
  return msg;

}


export async function syncUnit(unit: any): Promise<string> {

  // First let's see if the unit already exists
  let current;
  try {
    current = await getUnit(unit.id);
  } catch (err) {
    if (err.name !== 'UnitNotFound') throw err;
  }

  if (current) {

    // Has there been any updates?
    const comparableKeys = ['label', 'symbol', 'comment'];
    const comparableUnit = pick(unit, comparableKeys);
    const comparableCurrent = pick(current, comparableKeys);
    if (isEqual(comparableCurrent, comparableUnit)) {
      return 'unchanged';

    } else {
      // Update it
      logger.debug(`Unit '${unit.id}' no longer exactly matches the vocab definition, and therefore needs updating.`, {
        uoVersion: comparableUnit,
        buoVersion: comparableCurrent
      });
      const updates = nullPropertiesIfMissing(comparableUnit, ['symbol']);
      await updateUnit(unit.id, updates);
      return 'updated';

    }

  } else {
    // Create new record
    await createUnit(unit);
    return 'created';
  }

}



export async function syncDiscipline(discipline: any): Promise<string> {

  // First let's see if the discipline already exists
  let current;
  try {
    current = await getDiscipline(discipline.id);
  } catch (err) {
    if (err.name !== 'DisciplineNotFound') throw err;
  }

  if (current) {

    // Has there been any updates?
    const comparableKeys = ['label', 'comment'];
    const comparableDiscipline = pick(discipline, comparableKeys);
    const comparableCurrent = pick(current, comparableKeys);
    if (isEqual(comparableCurrent, comparableDiscipline)) {
      return 'unchanged';

    } else {
      // Update it
      logger.debug(`Discipline '${discipline.id}' no longer exactly matches the vocab definition, and therefore needs updating.`, {
        uoVersion: comparableDiscipline,
        buoVersion: comparableCurrent
      });
      const updates = comparableDiscipline;
      await updateDiscipline(discipline.id, updates);
      return 'updated';

    }

  } else {
    // Create new record
    await createDiscipline(discipline);
    return 'created';
  }

}



export async function syncObservableProperty(observableProperty: any): Promise<string> {

  // First let's see if the observableProperty already exists
  let current;
  try {
    current = await getObservableProperty(observableProperty.id);
  } catch (err) {
    if (err.name !== 'ObservablePropertyNotFound') throw err;
  }

  if (current) {

    // Has there been any updates?
    const comparableKeys = ['label', 'comment'];
    const comparableObservableProperty = pick(observableProperty, comparableKeys);
    const comparableCurrent = pick(current, comparableKeys);
    if (isEqual(comparableCurrent, comparableObservableProperty)) {
      return 'unchanged';

    } else {
      // Update it
      logger.debug(`ObservableProperty '${observableProperty.id}' no longer exactly matches the vocab definition, and therefore needs updating.`, {
        uoVersion: comparableObservableProperty,
        buoVersion: comparableCurrent
      });
      const updates = comparableObservableProperty;
      await updateObservableProperty(observableProperty.id, updates);
      return 'updated';

    }

  } else {
    // Create new record
    await createObservableProperty(observableProperty);
    return 'created';
  }

}



function nullPropertiesIfMissing(obj: any, nullableKeys: string[]): any {
  const nulledObj = cloneDeep(obj);
  nullableKeys.forEach((key) => {
    if (check.not.assigned(obj[key])) {
      nulledObj[key] = null;
    }
  });
  return nulledObj;
}



function parseVocab(vocab: any): {units: any[]; disciplines: any[]; observableProperties: any[]} {

  check.assert.nonEmptyArray(vocab.defines);

  const units = vocab.defines.filter((item) => item['@type'] === 'uo:Unit');
  const disciplines = vocab.defines.filter((item) => item['@type'] === 'uo:Discipline');
  const observableProperties = vocab.defines.filter((item) => item['@type'] === 'sosa:ObservableProperty');

  // Check each definition is valid.
  units.forEach((unit) => {
    const {error: err} = vocabUnitSchema.validate(unit);
    if (err) throw new Error(`Invalid unit (@id: ${unit['@id']}): ${err.message}`);
  });
  disciplines.forEach((discipline) => {
    const {error: err} = vocabDisciplineSchema.validate(discipline);
    if (err) throw new Error(`Invalid discipline (@id: ${discipline['@id']}): ${err.message}`);
  });
  observableProperties.forEach((observableProperty) => {
    const {error: err} = vocabObservablePropertySchema.validate(observableProperty);
    if (err) throw new Error(`Invalid observable property (@id: ${observableProperty['@id']}): ${err.message}`);
  });

  return {
    units: units.map(parseUnit),
    disciplines: disciplines.map(parseDiscipline),
    observableProperties: observableProperties.map(parseObservableProperty)
  };

}


// Takes a unit object from the common vocab, and formats it ready for the event stream, e.g. to be saved as a new unit.
function parseUnit(unit: any): any {
  const parsed: any = {
    id: stripPrefixFromId(unit['@id']),
    label: unit.label,
    comment: unit.comment || '',
    listed: true,
    inCommonVocab: true
  };
  if (unit.symbol) {
    parsed.symbol = unit.symbol;
  }
  return parsed;
}


function parseDiscipline(discipline: any): any {
  const parsed = {
    id: stripPrefixFromId(discipline['@id']),
    label: discipline.label,
    comment: discipline.comment || '',
    listed: true,
    inCommonVocab: true
  };
  return parsed;
}


function parseObservableProperty(observableProperty: any): any {
  const parsed: any = {
    id: stripPrefixFromId(observableProperty['@id']),
    label: observableProperty.label,
    comment: observableProperty.comment || '',
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


function stripPrefixFromId(id: string): string {
  const [partA, partB] = id.split(':');
  if (partB) {
    return partB;
  } else {
    return partA;
  }
}


async function getVocab(vocabUrl: string): Promise<any> {
  try {
    const response = await axios.get(vocabUrl);
    const vocab = response.data;
    return vocab;
  } catch (err) {
    throw new Error(`Failed to get Urban Obs Vocab. Reason: ${err.message}`);
  }
}