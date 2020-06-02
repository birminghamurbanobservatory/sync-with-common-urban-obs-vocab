import * as logger from 'node-logger';
import * as Promise from 'bluebird';
import {syncAggregations} from '../components/aggregation/aggregation.syncer';
import {syncDisciplines} from '../components/discipline/discipline.syncer';
import {syncUnits} from '../components/unit/unit.syncer';
import {syncObservableProperties} from '../components/observable-property/observable-property.syncer';
import {syncFeaturesOfInterest} from '../components/feature-of-interest/feature-of-interest.syncer';


export async function syncVocab(): Promise<void> {

  await syncAggregations();
  await syncDisciplines();
  await syncUnits(); // worth doing units before observable properties in case a new observable property references a new unit.
  await syncObservableProperties();
  await syncFeaturesOfInterest();

  return;

}














