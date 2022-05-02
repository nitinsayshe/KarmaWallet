/* eslint-disable dot-notation */
/* eslint-disable camelcase */
import path from 'path';
import csvtojson from 'csvtojson';
import { DataSourceModel, IDataSourceDocument } from '../../models/dataSource';
import { IUnsdgDocument, UnsdgModel } from '../../models/unsdg';
import { IUnsdgTargetDocument, UnsdgTargetModel } from '../../models/unsdgTarget';
import { DataSourceMappingModel, IUnsdgMapItem } from '../../models/dataSourceMapping';

interface IRawDataSourceMapping {
  name: string;
  url: string;
  notes: string;
  'No Poverty': string;
  '_1_1': string;
  '_1_2': string;
  '_1_3': string;
  '_1_4': string;
  '_1_5': string;
  '_1_a': string;
  '_1_b': string;
  'Zero Hunger': string;
  '_2_1': string;
  '_2_2': string;
  '_2_3': string;
  '_2_4': string;
  '_2_5': string;
  '_2_a': string;
  '_2_b': string;
  '_2_c': string;
  'Good Health and Well-Being': string;
  '_3_1': string;
  '_3_2': string;
  '_3_3': string;
  '_3_4': string;
  '_3_5': string;
  '_3_6': string;
  '_3_7': string;
  '_3_8': string;
  '_3_9': string;
  '_3_a': string;
  '_3_b': string;
  '_3_c': string;
  '_3_d': string;
  'Quality Education': string;
  '_4_1': string;
  '_4_2': string;
  '_4_3': string;
  '_4_4': string;
  '_4_5': string;
  '_4_6': string;
  '_4_7': string;
  '_4_a': string;
  '_4_b': string;
  '_4_c': string;
  'Gender Equality': string;
  '_5_1': string;
  '_5_2': string;
  '_5_3': string;
  '_5_4': string;
  '_5_5': string;
  '_5_6': string;
  '_5_a': string;
  '_5_b': string;
  '_5_c': string;
  'Clean Water and Sanitation': string;
  '_6_1': string;
  '_6_2': string;
  '_6_3': string;
  '_6_4': string;
  '_6_5': string;
  '_6_6': string;
  '_6_a': string;
  '_6_b': string;
  'Affordable and Clean Energy': string;
  '_7_1': string;
  '_7_2': string;
  '_7_3': string;
  '_7_a': string;
  '_7_b': string;
  'Decent Work and Economic Growth': string;
  '_8_1': string;
  '_8_2': string;
  '_8_3': string;
  '_8_4': string;
  '_8_5': string;
  '_8_6': string;
  '_8_7': string;
  '_8_8': string;
  '_8_9': string;
  '_8_10': string;
  '_8_a': string;
  '_8_b': string;
  'Industry, Innovation and Infrastructure': string;
  '_9_1': string;
  '_9_2': string;
  '_9_3': string;
  '_9_4': string;
  '_9_5': string;
  '_9_a': string;
  '_9_b': string;
  '_9_c': string;
  'Reduced Inequalities': string;
  '_10_1': string;
  '_10_2': string;
  '_10_3': string;
  '_10_4': string;
  '_10_5': string;
  '_10_6': string;
  '_10_7': string;
  '_10_a': string;
  '_10_b': string;
  '_10_c': string;
  'Sustainable Cities and Communities': string;
  '_11_1': string;
  '_11_2': string;
  '_11_3': string;
  '_11_4': string;
  '_11_5': string;
  '_11_6': string;
  '_11_7': string;
  '_11_a': string;
  '_11_b': string;
  '_11_c': string;
  'Responsible Consumption and Production': string;
  '_12_1': string;
  '_12_2': string;
  '_12_3': string;
  '_12_4': string;
  '_12_5': string;
  '_12_6': string;
  '_12_7': string;
  '_12_8': string;
  '_12_a': string;
  '_12_b': string;
  '_12_c': string;
  'Climate Action': string;
  '_13_1': string;
  '_13_2': string;
  '_13_3': string;
  '_13_a': string;
  '_13_b': string;
  'Life Below Water': string;
  '_14_1': string;
  '_14_2': string;
  '_14_3': string;
  '_14_4': string;
  '_14_5': string;
  '_14_6': string;
  '_14_7': string;
  '_14_a': string;
  '_14_b': string;
  '_14_c': string;
  'Life on Land': string;
  '_15_1': string;
  '_15_2': string;
  '_15_3': string;
  '_15_4': string;
  '_15_5': string;
  '_15_6': string;
  '_15_7': string;
  '_15_8': string;
  '_15_9': string;
  '_15_a': string;
  '_15_b': string;
  '_15_c': string;
  'Peace, Justice and Strong Institutions': string;
  '_16_1': string;
  '_16_2': string;
  '_16_3': string;
  '_16_4': string;
  '_16_5': string;
  '_16_6': string;
  '_16_7': string;
  '_16_8': string;
  '_16_9': string;
  '_16_10': string;
  '_16_a': string;
  '_16_b': string;
  'Partnerships for the Goals': string;
  '_17_1': string;
  '_17_2': string;
  '_17_3': string;
  '_17_4': string;
  '_17_5': string;
  '_17_6': string;
  '_17_7': string;
  '_17_8': string;
  '_17_9': string;
  '_17_10': string;
  '_17_11': string;
  '_17_12': string;
  '_17_13': string;
  '_17_14': string;
  '_17_15': string;
  '_17_16': string;
  '_17_17': string;
  '_17_18': string;
  '_17_19': string;
}

export const mapDataSourcesToUNSDGs = async () => {
  console.log('\nmapping data sources to unsdgs and unsdg targets that apply to them...');

  let dataSources: IDataSourceDocument[];
  let unsdgs: IUnsdgDocument[];
  let unsdgTargets: IUnsdgTargetDocument[];

  try {
    dataSources = await DataSourceModel.find({});
    unsdgs = await UnsdgModel.find({});
    unsdgTargets = await UnsdgTargetModel.find({});
  } catch (err) {
    console.log('[-] error retrieving data sources and unsdgs');
    console.log(err);
  }

  if (!dataSources || !unsdgs || !unsdgTargets) return;

  let rawData: IRawDataSourceMapping[];

  try {
    rawData = await csvtojson().fromFile(path.resolve(__dirname, '.tmp', 'data_source_mappings.csv'));
  } catch (err) {
    console.log('\n[-] error retrieving raw data source mapping data from csv');
    console.log(err, '\n');
  }

  if (!rawData) return;

  let _unsdg1: IUnsdgDocument;
  let _target1_1: IUnsdgTargetDocument;
  let _target1_2: IUnsdgTargetDocument;
  let _target1_3: IUnsdgTargetDocument;
  let _target1_4: IUnsdgTargetDocument;
  let _target1_5: IUnsdgTargetDocument;
  let _target1_a: IUnsdgTargetDocument;
  let _target1_b: IUnsdgTargetDocument;

  let _unsdg2: IUnsdgDocument;
  let _target2_1: IUnsdgTargetDocument;
  let _target2_2: IUnsdgTargetDocument;
  let _target2_3: IUnsdgTargetDocument;
  let _target2_4: IUnsdgTargetDocument;
  let _target2_5: IUnsdgTargetDocument;
  let _target2_a: IUnsdgTargetDocument;
  let _target2_b: IUnsdgTargetDocument;
  let _target2_c: IUnsdgTargetDocument;

  let _unsdg3: IUnsdgDocument;
  let _target3_1: IUnsdgTargetDocument;
  let _target3_2: IUnsdgTargetDocument;
  let _target3_3: IUnsdgTargetDocument;
  let _target3_4: IUnsdgTargetDocument;
  let _target3_5: IUnsdgTargetDocument;
  let _target3_6: IUnsdgTargetDocument;
  let _target3_7: IUnsdgTargetDocument;
  let _target3_8: IUnsdgTargetDocument;
  let _target3_9: IUnsdgTargetDocument;
  let _target3_a: IUnsdgTargetDocument;
  let _target3_b: IUnsdgTargetDocument;
  let _target3_c: IUnsdgTargetDocument;
  let _target3_d: IUnsdgTargetDocument;

  let _unsdg4: IUnsdgDocument;
  let _target4_1: IUnsdgTargetDocument;
  let _target4_2: IUnsdgTargetDocument;
  let _target4_3: IUnsdgTargetDocument;
  let _target4_4: IUnsdgTargetDocument;
  let _target4_5: IUnsdgTargetDocument;
  let _target4_6: IUnsdgTargetDocument;
  let _target4_7: IUnsdgTargetDocument;
  let _target4_a: IUnsdgTargetDocument;
  let _target4_b: IUnsdgTargetDocument;
  let _target4_c: IUnsdgTargetDocument;

  let _unsdg5: IUnsdgDocument;
  let _target5_1: IUnsdgTargetDocument;
  let _target5_2: IUnsdgTargetDocument;
  let _target5_3: IUnsdgTargetDocument;
  let _target5_4: IUnsdgTargetDocument;
  let _target5_5: IUnsdgTargetDocument;
  let _target5_6: IUnsdgTargetDocument;
  let _target5_a: IUnsdgTargetDocument;
  let _target5_b: IUnsdgTargetDocument;
  let _target5_c: IUnsdgTargetDocument;

  let _unsdg6: IUnsdgDocument;
  let _target6_1: IUnsdgTargetDocument;
  let _target6_2: IUnsdgTargetDocument;
  let _target6_3: IUnsdgTargetDocument;
  let _target6_4: IUnsdgTargetDocument;
  let _target6_5: IUnsdgTargetDocument;
  let _target6_6: IUnsdgTargetDocument;
  let _target6_a: IUnsdgTargetDocument;
  let _target6_b: IUnsdgTargetDocument;

  let _unsdg7: IUnsdgDocument;
  let _target7_1: IUnsdgTargetDocument;
  let _target7_2: IUnsdgTargetDocument;
  let _target7_3: IUnsdgTargetDocument;
  let _target7_a: IUnsdgTargetDocument;
  let _target7_b: IUnsdgTargetDocument;

  let _unsdg8: IUnsdgDocument;
  let _target8_1: IUnsdgTargetDocument;
  let _target8_2: IUnsdgTargetDocument;
  let _target8_3: IUnsdgTargetDocument;
  let _target8_4: IUnsdgTargetDocument;
  let _target8_5: IUnsdgTargetDocument;
  let _target8_6: IUnsdgTargetDocument;
  let _target8_7: IUnsdgTargetDocument;
  let _target8_8: IUnsdgTargetDocument;
  let _target8_9: IUnsdgTargetDocument;
  let _target8_10: IUnsdgTargetDocument;
  let _target8_a: IUnsdgTargetDocument;
  let _target8_b: IUnsdgTargetDocument;

  let _unsdg9: IUnsdgDocument;
  let _target9_1: IUnsdgTargetDocument;
  let _target9_2: IUnsdgTargetDocument;
  let _target9_3: IUnsdgTargetDocument;
  let _target9_4: IUnsdgTargetDocument;
  let _target9_5: IUnsdgTargetDocument;
  let _target9_a: IUnsdgTargetDocument;
  let _target9_b: IUnsdgTargetDocument;
  let _target9_c: IUnsdgTargetDocument;

  let _unsdg10: IUnsdgDocument;
  let _target10_1: IUnsdgTargetDocument;
  let _target10_2: IUnsdgTargetDocument;
  let _target10_3: IUnsdgTargetDocument;
  let _target10_4: IUnsdgTargetDocument;
  let _target10_5: IUnsdgTargetDocument;
  let _target10_6: IUnsdgTargetDocument;
  let _target10_7: IUnsdgTargetDocument;
  let _target10_a: IUnsdgTargetDocument;
  let _target10_b: IUnsdgTargetDocument;
  let _target10_c: IUnsdgTargetDocument;

  let _unsdg11: IUnsdgDocument;
  let _target11_1: IUnsdgTargetDocument;
  let _target11_2: IUnsdgTargetDocument;
  let _target11_3: IUnsdgTargetDocument;
  let _target11_4: IUnsdgTargetDocument;
  let _target11_5: IUnsdgTargetDocument;
  let _target11_6: IUnsdgTargetDocument;
  let _target11_7: IUnsdgTargetDocument;
  let _target11_a: IUnsdgTargetDocument;
  let _target11_b: IUnsdgTargetDocument;
  let _target11_c: IUnsdgTargetDocument;

  let _unsdg12: IUnsdgDocument;
  let _target12_1: IUnsdgTargetDocument;
  let _target12_2: IUnsdgTargetDocument;
  let _target12_3: IUnsdgTargetDocument;
  let _target12_4: IUnsdgTargetDocument;
  let _target12_5: IUnsdgTargetDocument;
  let _target12_6: IUnsdgTargetDocument;
  let _target12_7: IUnsdgTargetDocument;
  let _target12_8: IUnsdgTargetDocument;
  let _target12_a: IUnsdgTargetDocument;
  let _target12_b: IUnsdgTargetDocument;
  let _target12_c: IUnsdgTargetDocument;

  let _unsdg13: IUnsdgDocument;
  let _target13_1: IUnsdgTargetDocument;
  let _target13_2: IUnsdgTargetDocument;
  let _target13_3: IUnsdgTargetDocument;
  let _target13_a: IUnsdgTargetDocument;
  let _target13_b: IUnsdgTargetDocument;

  let _unsdg14: IUnsdgDocument;
  let _target14_1: IUnsdgTargetDocument;
  let _target14_2: IUnsdgTargetDocument;
  let _target14_3: IUnsdgTargetDocument;
  let _target14_4: IUnsdgTargetDocument;
  let _target14_5: IUnsdgTargetDocument;
  let _target14_6: IUnsdgTargetDocument;
  let _target14_7: IUnsdgTargetDocument;
  let _target14_a: IUnsdgTargetDocument;
  let _target14_b: IUnsdgTargetDocument;
  let _target14_c: IUnsdgTargetDocument;

  let _unsdg15: IUnsdgDocument;
  let _target15_1: IUnsdgTargetDocument;
  let _target15_2: IUnsdgTargetDocument;
  let _target15_3: IUnsdgTargetDocument;
  let _target15_4: IUnsdgTargetDocument;
  let _target15_5: IUnsdgTargetDocument;
  let _target15_6: IUnsdgTargetDocument;
  let _target15_7: IUnsdgTargetDocument;
  let _target15_8: IUnsdgTargetDocument;
  let _target15_9: IUnsdgTargetDocument;
  let _target15_a: IUnsdgTargetDocument;
  let _target15_b: IUnsdgTargetDocument;
  let _target15_c: IUnsdgTargetDocument;

  let _unsdg16: IUnsdgDocument;
  let _target16_1: IUnsdgTargetDocument;
  let _target16_2: IUnsdgTargetDocument;
  let _target16_3: IUnsdgTargetDocument;
  let _target16_4: IUnsdgTargetDocument;
  let _target16_5: IUnsdgTargetDocument;
  let _target16_6: IUnsdgTargetDocument;
  let _target16_7: IUnsdgTargetDocument;
  let _target16_8: IUnsdgTargetDocument;
  let _target16_9: IUnsdgTargetDocument;
  let _target16_10: IUnsdgTargetDocument;
  let _target16_a: IUnsdgTargetDocument;
  let _target16_b: IUnsdgTargetDocument;

  let _unsdg17: IUnsdgDocument;
  let _target17_1: IUnsdgTargetDocument;
  let _target17_2: IUnsdgTargetDocument;
  let _target17_3: IUnsdgTargetDocument;
  let _target17_4: IUnsdgTargetDocument;
  let _target17_5: IUnsdgTargetDocument;
  let _target17_6: IUnsdgTargetDocument;
  let _target17_7: IUnsdgTargetDocument;
  let _target17_8: IUnsdgTargetDocument;
  let _target17_9: IUnsdgTargetDocument;
  let _target17_10: IUnsdgTargetDocument;
  let _target17_11: IUnsdgTargetDocument;
  let _target17_12: IUnsdgTargetDocument;
  let _target17_13: IUnsdgTargetDocument;
  let _target17_14: IUnsdgTargetDocument;
  let _target17_15: IUnsdgTargetDocument;
  let _target17_16: IUnsdgTargetDocument;
  let _target17_17: IUnsdgTargetDocument;
  let _target17_18: IUnsdgTargetDocument;
  let _target17_19: IUnsdgTargetDocument;

  for (const unsdg of unsdgs) {
    if (unsdg.title === 'No Poverty') _unsdg1 = unsdg;
    if (unsdg.title === 'Zero Hunger') _unsdg2 = unsdg;
    if (unsdg.title === 'Good Health and Well-Being') _unsdg3 = unsdg;
    if (unsdg.title === 'Quality Education') _unsdg4 = unsdg;
    if (unsdg.title === 'Gender Equality') _unsdg5 = unsdg;
    if (unsdg.title === 'Clean Water and Sanitation') _unsdg6 = unsdg;
    if (unsdg.title === 'Affordable and Clean Energy') _unsdg7 = unsdg;
    if (unsdg.title === 'Decent Work and Economic Growth') _unsdg8 = unsdg;
    if (unsdg.title === 'Industry, Innovation and Infrastructure') _unsdg9 = unsdg;
    if (unsdg.title === 'Reduced Inequalities') _unsdg10 = unsdg;
    if (unsdg.title === 'Sustainable Cities and Communities') _unsdg11 = unsdg;
    if (unsdg.title === 'Responsible Consumption and Production') _unsdg12 = unsdg;
    if (unsdg.title === 'Climate Action') _unsdg13 = unsdg;
    if (unsdg.title === 'Life Below Water') _unsdg14 = unsdg;
    if (unsdg.title === 'Life on Land') _unsdg15 = unsdg;
    if (unsdg.title === 'Peace, Justice and Strong Institutions') _unsdg16 = unsdg;
    if (unsdg.title === 'Partnerships for the Goals') _unsdg17 = unsdg;
  }

  for (const target of unsdgTargets) {
    if (target.title === '_1_1') _target1_1 = target;
    if (target.title === '_1_2') _target1_2 = target;
    if (target.title === '_1_3') _target1_3 = target;
    if (target.title === '_1_4') _target1_4 = target;
    if (target.title === '_1_5') _target1_5 = target;
    if (target.title === '_1_a') _target1_a = target;
    if (target.title === '_1_b') _target1_b = target;

    if (target.title === '_2_1') _target2_1 = target;
    if (target.title === '_2_2') _target2_2 = target;
    if (target.title === '_2_3') _target2_3 = target;
    if (target.title === '_2_4') _target2_4 = target;
    if (target.title === '_2_5') _target2_5 = target;
    if (target.title === '_2_a') _target2_a = target;
    if (target.title === '_2_b') _target2_b = target;
    if (target.title === '_2_c') _target2_c = target;

    if (target.title === '_3_1') _target3_1 = target;
    if (target.title === '_3_2') _target3_2 = target;
    if (target.title === '_3_3') _target3_3 = target;
    if (target.title === '_3_4') _target3_4 = target;
    if (target.title === '_3_5') _target3_5 = target;
    if (target.title === '_3_6') _target3_6 = target;
    if (target.title === '_3_7') _target3_7 = target;
    if (target.title === '_3_8') _target3_8 = target;
    if (target.title === '_3_9') _target3_9 = target;
    if (target.title === '_3_a') _target3_a = target;
    if (target.title === '_3_b') _target3_b = target;
    if (target.title === '_3_c') _target3_c = target;
    if (target.title === '_3_d') _target3_d = target;

    if (target.title === '_4_1') _target4_1 = target;
    if (target.title === '_4_2') _target4_2 = target;
    if (target.title === '_4_3') _target4_3 = target;
    if (target.title === '_4_4') _target4_4 = target;
    if (target.title === '_4_5') _target4_5 = target;
    if (target.title === '_4_6') _target4_6 = target;
    if (target.title === '_4_7') _target4_7 = target;
    if (target.title === '_4_a') _target4_a = target;
    if (target.title === '_4_b') _target4_b = target;
    if (target.title === '_4_c') _target4_c = target;

    if (target.title === '_5_1') _target5_1 = target;
    if (target.title === '_5_2') _target5_2 = target;
    if (target.title === '_5_3') _target5_3 = target;
    if (target.title === '_5_4') _target5_4 = target;
    if (target.title === '_5_5') _target5_5 = target;
    if (target.title === '_5_6') _target5_6 = target;
    if (target.title === '_5_a') _target5_a = target;
    if (target.title === '_5_b') _target5_b = target;
    if (target.title === '_5_c') _target5_c = target;

    if (target.title === '_6_1') _target6_1 = target;
    if (target.title === '_6_2') _target6_2 = target;
    if (target.title === '_6_3') _target6_3 = target;
    if (target.title === '_6_4') _target6_4 = target;
    if (target.title === '_6_5') _target6_5 = target;
    if (target.title === '_6_6') _target6_6 = target;
    if (target.title === '_6_a') _target6_a = target;
    if (target.title === '_6_b') _target6_b = target;

    if (target.title === '_7_1') _target7_1 = target;
    if (target.title === '_7_2') _target7_2 = target;
    if (target.title === '_7_3') _target7_3 = target;
    if (target.title === '_7_a') _target7_a = target;
    if (target.title === '_7_b') _target7_b = target;

    if (target.title === '_8_1') _target8_1 = target;
    if (target.title === '_8_2') _target8_2 = target;
    if (target.title === '_8_3') _target8_3 = target;
    if (target.title === '_8_4') _target8_4 = target;
    if (target.title === '_8_5') _target8_5 = target;
    if (target.title === '_8_6') _target8_6 = target;
    if (target.title === '_8_7') _target8_7 = target;
    if (target.title === '_8_8') _target8_8 = target;
    if (target.title === '_8_9') _target8_9 = target;
    if (target.title === '_8_10') _target8_10 = target;
    if (target.title === '_8_a') _target8_a = target;
    if (target.title === '_8_b') _target8_b = target;

    if (target.title === '_9_1') _target9_1 = target;
    if (target.title === '_9_2') _target9_2 = target;
    if (target.title === '_9_3') _target9_3 = target;
    if (target.title === '_9_4') _target9_4 = target;
    if (target.title === '_9_5') _target9_5 = target;
    if (target.title === '_9_a') _target9_a = target;
    if (target.title === '_9_b') _target9_b = target;
    if (target.title === '_9_c') _target9_c = target;

    if (target.title === '_10_1') _target10_1 = target;
    if (target.title === '_10_2') _target10_2 = target;
    if (target.title === '_10_3') _target10_3 = target;
    if (target.title === '_10_4') _target10_4 = target;
    if (target.title === '_10_5') _target10_5 = target;
    if (target.title === '_10_6') _target10_6 = target;
    if (target.title === '_10_7') _target10_7 = target;
    if (target.title === '_10_a') _target10_a = target;
    if (target.title === '_10_b') _target10_b = target;
    if (target.title === '_10_c') _target10_c = target;

    if (target.title === '_11_1') _target11_1 = target;
    if (target.title === '_11_2') _target11_2 = target;
    if (target.title === '_11_3') _target11_3 = target;
    if (target.title === '_11_4') _target11_4 = target;
    if (target.title === '_11_5') _target11_5 = target;
    if (target.title === '_11_6') _target11_6 = target;
    if (target.title === '_11_7') _target11_7 = target;
    if (target.title === '_11_a') _target11_a = target;
    if (target.title === '_11_b') _target11_b = target;
    if (target.title === '_11_c') _target11_c = target;

    if (target.title === '_12_2') _target12_2 = target;
    if (target.title === '_12_1') _target12_1 = target;
    if (target.title === '_12_3') _target12_3 = target;
    if (target.title === '_12_4') _target12_4 = target;
    if (target.title === '_12_5') _target12_5 = target;
    if (target.title === '_12_6') _target12_6 = target;
    if (target.title === '_12_7') _target12_7 = target;
    if (target.title === '_12_8') _target12_7 = target;
    if (target.title === '_12_a') _target12_a = target;
    if (target.title === '_12_b') _target12_b = target;
    if (target.title === '_12_c') _target12_c = target;

    if (target.title === '_13_2') _target13_2 = target;
    if (target.title === '_13_1') _target13_1 = target;
    if (target.title === '_13_3') _target13_3 = target;
    if (target.title === '_13_a') _target13_a = target;
    if (target.title === '_13_b') _target13_b = target;

    if (target.title === '_14_2') _target14_2 = target;
    if (target.title === '_14_1') _target14_1 = target;
    if (target.title === '_14_3') _target14_3 = target;
    if (target.title === '_14_4') _target14_4 = target;
    if (target.title === '_14_5') _target14_5 = target;
    if (target.title === '_14_6') _target14_6 = target;
    if (target.title === '_14_7') _target14_7 = target;
    if (target.title === '_14_a') _target14_a = target;
    if (target.title === '_14_b') _target14_b = target;
    if (target.title === '_14_c') _target14_c = target;

    if (target.title === '_15_2') _target15_2 = target;
    if (target.title === '_15_1') _target15_1 = target;
    if (target.title === '_15_3') _target15_3 = target;
    if (target.title === '_15_4') _target15_4 = target;
    if (target.title === '_15_5') _target15_5 = target;
    if (target.title === '_15_6') _target15_6 = target;
    if (target.title === '_15_7') _target15_7 = target;
    if (target.title === '_15_8') _target15_8 = target;
    if (target.title === '_15_9') _target15_9 = target;
    if (target.title === '_15_a') _target15_a = target;
    if (target.title === '_15_b') _target15_b = target;
    if (target.title === '_15_c') _target15_c = target;

    if (target.title === '_16_2') _target16_2 = target;
    if (target.title === '_16_1') _target16_1 = target;
    if (target.title === '_16_3') _target16_3 = target;
    if (target.title === '_16_4') _target16_4 = target;
    if (target.title === '_16_5') _target16_5 = target;
    if (target.title === '_16_6') _target16_6 = target;
    if (target.title === '_16_7') _target16_7 = target;
    if (target.title === '_16_8') _target16_8 = target;
    if (target.title === '_16_9') _target16_9 = target;
    if (target.title === '_16_10') _target16_10 = target;
    if (target.title === '_16_a') _target16_a = target;
    if (target.title === '_16_b') _target16_b = target;

    if (target.title === '_17_2') _target17_2 = target;
    if (target.title === '_17_1') _target17_1 = target;
    if (target.title === '_17_3') _target17_3 = target;
    if (target.title === '_17_4') _target17_4 = target;
    if (target.title === '_17_5') _target17_5 = target;
    if (target.title === '_17_6') _target17_6 = target;
    if (target.title === '_17_7') _target17_7 = target;
    if (target.title === '_17_8') _target17_8 = target;
    if (target.title === '_17_9') _target17_9 = target;
    if (target.title === '_17_10') _target17_10 = target;
    if (target.title === '_17_11') _target17_11 = target;
    if (target.title === '_17_12') _target17_12 = target;
    if (target.title === '_17_13') _target17_13 = target;
    if (target.title === '_17_14') _target17_14 = target;
    if (target.title === '_17_15') _target17_15 = target;
    if (target.title === '_17_16') _target17_16 = target;
    if (target.title === '_17_17') _target17_17 = target;
    if (target.title === '_17_18') _target17_18 = target;
    if (target.title === '_17_19') _target17_19 = target;
  }

  let count = 0;
  let errorCount = 0;

  for (const row of rawData) {
    try {
      const dataSource = dataSources.find(d => d.name === row.name);

      if (!dataSource) {
        console.log(`[-] failed to find data source: ${row.name}`);
        continue;
      }

      const dataSourceMapping = new DataSourceMappingModel({
        source: dataSource,
        unsdgs: [],
      });

      const unsdg1: IUnsdgMapItem = {
        unsdg: _unsdg1,
        value: !!row['No Poverty'] ? parseFloat(row['No Poverty']) : null,
        exists: !!row['No Poverty'],
        targets: [
          {
            target: _target1_1,
            value: !!row['_1_1'] ? parseFloat(row['_1_1']) : null,
            exists: !!row['_1_1'],
          },
          {
            target: _target1_2,
            value: !!row['_1_2'] ? parseFloat(row['_1_2']) : null,
            exists: !!row['_1_2'],
          },
          {
            target: _target1_3,
            value: !!row['_1_3'] ? parseFloat(row['_1_3']) : null,
            exists: !!row['_1_3'],
          },
          {
            target: _target1_4,
            value: !!row['_1_4'] ? parseFloat(row['_1_4']) : null,
            exists: !!row['_1_4'],
          },
          {
            target: _target1_5,
            value: !!row['_1_5'] ? parseFloat(row['_1_5']) : null,
            exists: !!row['_1_5'],
          },
          {
            target: _target1_a,
            value: !!row['_1_a'] ? parseFloat(row['_1_a']) : null,
            exists: !!row['_1_a'],
          },
          {
            target: _target1_b,
            value: !!row['_1_b'] ? parseFloat(row['_1_b']) : null,
            exists: !!row['_1_b'],
          },
        ],
      };

      dataSourceMapping.unsdgs.push(unsdg1);

      const unsdg2: IUnsdgMapItem = {
        unsdg: _unsdg2,
        value: !!row['Zero Hunger'] ? parseFloat(row['Zero Hunger']) : null,
        exists: !!row['Zero Hunger'],
        targets: [
          {
            target: _target2_1,
            value: !!row['_2_1'] ? parseFloat(row['_2_1']) : null,
            exists: !!row['_2_1'],
          },
          {
            target: _target2_2,
            value: !!row['_2_2'] ? parseFloat(row['_2_2']) : null,
            exists: !!row['_2_2'],
          },
          {
            target: _target2_3,
            value: !!row['_2_3'] ? parseFloat(row['_2_3']) : null,
            exists: !!row['_2_3'],
          },
          {
            target: _target2_4,
            value: !!row['_2_4'] ? parseFloat(row['_2_4']) : null,
            exists: !!row['_2_4'],
          },
          {
            target: _target2_5,
            value: !!row['_2_5'] ? parseFloat(row['_2_5']) : null,
            exists: !!row['_2_5'],
          },
          {
            target: _target2_a,
            value: !!row['_2_a'] ? parseFloat(row['_2_a']) : null,
            exists: !!row['_2_a'],
          },
          {
            target: _target2_b,
            value: !!row['_2_b'] ? parseFloat(row['_2_b']) : null,
            exists: !!row['_2_b'],
          },
          {
            target: _target2_c,
            value: !!row['_2_c'] ? parseFloat(row['_2_c']) : null,
            exists: !!row['_2_c'],
          },
        ],
      };

      dataSourceMapping.unsdgs.push(unsdg2);

      const unsdg3: IUnsdgMapItem = {
        unsdg: _unsdg3,
        value: !!row['Good Health and Well-Being'] ? parseFloat(row['Good Health and Well-Being']) : null,
        exists: !!row['Good Health and Well-Being'],
        targets: [
          {
            target: _target3_1,
            value: !!row['_3_1'] ? parseFloat(row['_3_1']) : null,
            exists: !!row['_3_1'],
          },
          {
            target: _target3_2,
            value: !!row['_3_2'] ? parseFloat(row['_3_2']) : null,
            exists: !!row['_3_2'],
          },
          {
            target: _target3_3,
            value: !!row['_3_3'] ? parseFloat(row['_3_3']) : null,
            exists: !!row['_3_3'],
          },
          {
            target: _target3_4,
            value: !!row['_3_4'] ? parseFloat(row['_3_4']) : null,
            exists: !!row['_3_4'],
          },
          {
            target: _target3_5,
            value: !!row['_3_5'] ? parseFloat(row['_3_5']) : null,
            exists: !!row['_3_5'],
          },
          {
            target: _target3_6,
            value: !!row['_3_6'] ? parseFloat(row['_3_6']) : null,
            exists: !!row['_3_6'],
          },
          {
            target: _target3_7,
            value: !!row['_3_7'] ? parseFloat(row['_3_7']) : null,
            exists: !!row['_3_7'],
          },
          {
            target: _target3_8,
            value: !!row['_3_8'] ? parseFloat(row['_3_8']) : null,
            exists: !!row['_3_8'],
          },
          {
            target: _target3_9,
            value: !!row['_3_9'] ? parseFloat(row['_3_9']) : null,
            exists: !!row['_3_9'],
          },
          {
            target: _target3_a,
            value: !!row['_3_a'] ? parseFloat(row['_3_a']) : null,
            exists: !!row['_3_a'],
          },
          {
            target: _target3_b,
            value: !!row['_3_b'] ? parseFloat(row['_3_b']) : null,
            exists: !!row['_3_b'],
          },
          {
            target: _target3_c,
            value: !!row['_3_c'] ? parseFloat(row['_3_c']) : null,
            exists: !!row['_3_c'],
          },
          {
            target: _target3_d,
            value: !!row['_3_d'] ? parseFloat(row['_3_d']) : null,
            exists: !!row['_3_d'],
          },
        ],
      };

      dataSourceMapping.unsdgs.push(unsdg3);

      const unsdg4: IUnsdgMapItem = {
        unsdg: _unsdg4,
        value: !!row['Quality Education'] ? parseFloat(row['Quality Education']) : null,
        exists: !!row['Quality Education'],
        targets: [
          {
            target: _target4_1,
            value: !!row['_4_1'] ? parseFloat(row['_4_1']) : null,
            exists: !!row['_4_1'],
          },
          {
            target: _target4_2,
            value: !!row['_4_2'] ? parseFloat(row['_4_2']) : null,
            exists: !!row['_4_2'],
          },
          {
            target: _target4_3,
            value: !!row['_4_3'] ? parseFloat(row['_4_3']) : null,
            exists: !!row['_4_3'],
          },
          {
            target: _target4_4,
            value: !!row['_4_4'] ? parseFloat(row['_4_4']) : null,
            exists: !!row['_4_4'],
          },
          {
            target: _target4_5,
            value: !!row['_4_5'] ? parseFloat(row['_4_5']) : null,
            exists: !!row['_4_5'],
          },
          {
            target: _target4_6,
            value: !!row['_4_6'] ? parseFloat(row['_4_6']) : null,
            exists: !!row['_4_6'],
          },
          {
            target: _target4_7,
            value: !!row['_4_7'] ? parseFloat(row['_4_7']) : null,
            exists: !!row['_4_7'],
          },
          {
            target: _target4_a,
            value: !!row['_4_a'] ? parseFloat(row['_4_a']) : null,
            exists: !!row['_4_a'],
          },
          {
            target: _target4_b,
            value: !!row['_4_b'] ? parseFloat(row['_4_b']) : null,
            exists: !!row['_4_b'],
          },
          {
            target: _target4_c,
            value: !!row['_4_c'] ? parseFloat(row['_4_c']) : null,
            exists: !!row['_4_c'],
          },
        ],
      };

      dataSourceMapping.unsdgs.push(unsdg4);

      const unsdg5: IUnsdgMapItem = {
        unsdg: _unsdg5,
        value: !!row['Gender Equality'] ? parseFloat(row['Gender Equality']) : null,
        exists: !!row['Gender Equality'],
        targets: [
          {
            target: _target5_1,
            value: !!row['_5_1'] ? parseFloat(row['_5_1']) : null,
            exists: !!row['_5_1'],
          },
          {
            target: _target5_2,
            value: !!row['_5_2'] ? parseFloat(row['_5_2']) : null,
            exists: !!row['_5_2'],
          },
          {
            target: _target5_3,
            value: !!row['_5_3'] ? parseFloat(row['_5_3']) : null,
            exists: !!row['_5_3'],
          },
          {
            target: _target5_4,
            value: !!row['_5_4'] ? parseFloat(row['_5_4']) : null,
            exists: !!row['_5_4'],
          },
          {
            target: _target5_5,
            value: !!row['_5_5'] ? parseFloat(row['_5_5']) : null,
            exists: !!row['_5_5'],
          },
          {
            target: _target5_6,
            value: !!row['_5_6'] ? parseFloat(row['_5_6']) : null,
            exists: !!row['_5_6'],
          },
          {
            target: _target5_a,
            value: !!row['_5_a'] ? parseFloat(row['_5_a']) : null,
            exists: !!row['_5_a'],
          },
          {
            target: _target5_b,
            value: !!row['_5_b'] ? parseFloat(row['_5_b']) : null,
            exists: !!row['_5_b'],
          },
          {
            target: _target5_c,
            value: !!row['_5_c'] ? parseFloat(row['_5_c']) : null,
            exists: !!row['_5_c'],
          },
        ],
      };

      dataSourceMapping.unsdgs.push(unsdg5);

      const unsdg6: IUnsdgMapItem = {
        unsdg: _unsdg5,
        value: !!row['Clean Water and Sanitation'] ? parseFloat(row['Clean Water and Sanitation']) : null,
        exists: !!row['Clean Water and Sanitation'],
        targets: [
          {
            target: _target6_1,
            value: !!row['_6_1'] ? parseFloat(row['_6_1']) : null,
            exists: !!row['_6_1'],
          },
          {
            target: _target6_2,
            value: !!row['_6_2'] ? parseFloat(row['_6_2']) : null,
            exists: !!row['_6_2'],
          },
          {
            target: _target6_3,
            value: !!row['_6_3'] ? parseFloat(row['_6_3']) : null,
            exists: !!row['_6_3'],
          },
          {
            target: _target6_4,
            value: !!row['_6_4'] ? parseFloat(row['_6_4']) : null,
            exists: !!row['_6_4'],
          },
          {
            target: _target6_5,
            value: !!row['_6_5'] ? parseFloat(row['_6_5']) : null,
            exists: !!row['_6_5'],
          },
          {
            target: _target6_6,
            value: !!row['_6_6'] ? parseFloat(row['_6_6']) : null,
            exists: !!row['_6_6'],
          },
          {
            target: _target6_a,
            value: !!row['_6_a'] ? parseFloat(row['_6_a']) : null,
            exists: !!row['_6_a'],
          },
          {
            target: _target6_b,
            value: !!row['_6_b'] ? parseFloat(row['_6_b']) : null,
            exists: !!row['_6_b'],
          },
        ],
      };

      dataSourceMapping.unsdgs.push(unsdg6);

      const unsdg7: IUnsdgMapItem = {
        unsdg: _unsdg7,
        value: !!row['Affordable and Clean Energy'] ? parseFloat(row['Affordable and Clean Energy']) : null,
        exists: !!row['Affordable and Clean Energy'],
        targets: [
          {
            target: _target7_1,
            value: !!row['_7_1'] ? parseFloat(row['_7_1']) : null,
            exists: !!row['_7_1'],
          },
          {
            target: _target7_2,
            value: !!row['_7_2'] ? parseFloat(row['_7_2']) : null,
            exists: !!row['_7_2'],
          },
          {
            target: _target7_3,
            value: !!row['_7_3'] ? parseFloat(row['_7_3']) : null,
            exists: !!row['_7_3'],
          },
          {
            target: _target7_a,
            value: !!row['_7_a'] ? parseFloat(row['_7_a']) : null,
            exists: !!row['_7_a'],
          },
          {
            target: _target7_b,
            value: !!row['_7_b'] ? parseFloat(row['_7_b']) : null,
            exists: !!row['_7_b'],
          },
        ],
      };

      dataSourceMapping.unsdgs.push(unsdg7);

      const unsdg8: IUnsdgMapItem = {
        unsdg: _unsdg8,
        value: !!row['Decent Work and Economic Growth'] ? parseFloat(row['Decent Work and Economic Growth']) : null,
        exists: !!row['Decent Work and Economic Growth'],
        targets: [
          {
            target: _target8_1,
            value: !!row['_8_1'] ? parseFloat(row['_8_1']) : null,
            exists: !!row['_8_1'],
          },
          {
            target: _target8_2,
            value: !!row['_8_2'] ? parseFloat(row['_8_2']) : null,
            exists: !!row['_8_2'],
          },
          {
            target: _target8_3,
            value: !!row['_8_3'] ? parseFloat(row['_8_3']) : null,
            exists: !!row['_8_3'],
          },
          {
            target: _target8_4,
            value: !!row['_8_4'] ? parseFloat(row['_8_4']) : null,
            exists: !!row['_8_4'],
          },
          {
            target: _target8_5,
            value: !!row['_8_5'] ? parseFloat(row['_8_5']) : null,
            exists: !!row['_8_5'],
          },
          {
            target: _target8_6,
            value: !!row['_8_6'] ? parseFloat(row['_8_6']) : null,
            exists: !!row['_8_6'],
          },
          {
            target: _target8_7,
            value: !!row['_8_7'] ? parseFloat(row['_8_7']) : null,
            exists: !!row['_8_7'],
          },
          {
            target: _target8_8,
            value: !!row['_8_8'] ? parseFloat(row['_8_8']) : null,
            exists: !!row['_8_8'],
          },
          {
            target: _target8_9,
            value: !!row['_8_9'] ? parseFloat(row['_8_9']) : null,
            exists: !!row['_8_9'],
          },
          {
            target: _target8_10,
            value: !!row['_8_10'] ? parseFloat(row['_8_10']) : null,
            exists: !!row['_8_10'],
          },
          {
            target: _target8_a,
            value: !!row['_8_a'] ? parseFloat(row['_8_a']) : null,
            exists: !!row['_8_a'],
          },
          {
            target: _target8_b,
            value: !!row['_8_b'] ? parseFloat(row['_8_b']) : null,
            exists: !!row['_8_b'],
          },
        ],
      };

      dataSourceMapping.unsdgs.push(unsdg8);

      const unsdg9: IUnsdgMapItem = {
        unsdg: _unsdg9,
        value: !!row['Industry, Innovation and Infrastructure'] ? parseFloat(row['Industry, Innovation and Infrastructure']) : null,
        exists: !!row['Industry, Innovation and Infrastructure'],
        targets: [
          {
            target: _target9_1,
            value: !!row['_9_1'] ? parseFloat(row['_9_1']) : null,
            exists: !!row['_9_1'],
          },
          {
            target: _target9_2,
            value: !!row['_9_2'] ? parseFloat(row['_9_2']) : null,
            exists: !!row['_9_2'],
          },
          {
            target: _target9_3,
            value: !!row['_9_3'] ? parseFloat(row['_9_3']) : null,
            exists: !!row['_9_3'],
          },
          {
            target: _target9_4,
            value: !!row['_9_4'] ? parseFloat(row['_9_4']) : null,
            exists: !!row['_9_4'],
          },
          {
            target: _target9_5,
            value: !!row['_9_5'] ? parseFloat(row['_9_5']) : null,
            exists: !!row['_9_5'],
          },
          {
            target: _target9_a,
            value: !!row['_9_a'] ? parseFloat(row['_9_a']) : null,
            exists: !!row['_9_a'],
          },
          {
            target: _target9_b,
            value: !!row['_9_b'] ? parseFloat(row['_9_b']) : null,
            exists: !!row['_9_b'],
          },
          {
            target: _target9_c,
            value: !!row['_9_c'] ? parseFloat(row['_9_c']) : null,
            exists: !!row['_9_c'],
          },
        ],
      };

      dataSourceMapping.unsdgs.push(unsdg9);

      const unsdg10: IUnsdgMapItem = {
        unsdg: _unsdg10,
        value: !!row['Reduced Inequalities'] ? parseFloat(row['Reduced Inequalities']) : null,
        exists: !!row['Reduced Inequalities'],
        targets: [
          {
            target: _target10_1,
            value: !!row['_10_1'] ? parseFloat(row['_10_1']) : null,
            exists: !!row['_10_1'],
          },
          {
            target: _target10_2,
            value: !!row['_10_2'] ? parseFloat(row['_10_2']) : null,
            exists: !!row['_10_2'],
          },
          {
            target: _target10_3,
            value: !!row['_10_3'] ? parseFloat(row['_10_3']) : null,
            exists: !!row['_10_3'],
          },
          {
            target: _target10_4,
            value: !!row['_10_4'] ? parseFloat(row['_10_4']) : null,
            exists: !!row['_10_4'],
          },
          {
            target: _target10_5,
            value: !!row['_10_5'] ? parseFloat(row['_10_5']) : null,
            exists: !!row['_10_5'],
          },
          {
            target: _target10_6,
            value: !!row['_10_6'] ? parseFloat(row['_10_6']) : null,
            exists: !!row['_10_6'],
          },
          {
            target: _target10_7,
            value: !!row['_10_7'] ? parseFloat(row['_10_7']) : null,
            exists: !!row['_10_7'],
          },
          {
            target: _target10_a,
            value: !!row['_10_a'] ? parseFloat(row['_10_a']) : null,
            exists: !!row['_10_a'],
          },
          {
            target: _target10_b,
            value: !!row['_10_b'] ? parseFloat(row['_10_b']) : null,
            exists: !!row['_10_b'],
          },
          {
            target: _target10_c,
            value: !!row['_10_c'] ? parseFloat(row['_10_c']) : null,
            exists: !!row['_10_c'],
          },
        ],
      };

      dataSourceMapping.unsdgs.push(unsdg10);

      const unsdg11: IUnsdgMapItem = {
        unsdg: _unsdg11,
        value: !!row['Sustainable Cities and Communities'] ? parseFloat(row['Sustainable Cities and Communities']) : null,
        exists: !!row['Sustainable Cities and Communities'],
        targets: [
          {
            target: _target11_1,
            value: !!row['_11_1'] ? parseFloat(row['_11_1']) : null,
            exists: !!row['_11_1'],
          },
          {
            target: _target11_2,
            value: !!row['_11_2'] ? parseFloat(row['_11_2']) : null,
            exists: !!row['_11_2'],
          },
          {
            target: _target11_3,
            value: !!row['_11_3'] ? parseFloat(row['_11_3']) : null,
            exists: !!row['_11_3'],
          },
          {
            target: _target11_4,
            value: !!row['_11_4'] ? parseFloat(row['_11_4']) : null,
            exists: !!row['_11_4'],
          },
          {
            target: _target11_5,
            value: !!row['_11_5'] ? parseFloat(row['_11_5']) : null,
            exists: !!row['_11_5'],
          },
          {
            target: _target11_6,
            value: !!row['_11_6'] ? parseFloat(row['_11_6']) : null,
            exists: !!row['_11_6'],
          },
          {
            target: _target11_7,
            value: !!row['_11_7'] ? parseFloat(row['_11_7']) : null,
            exists: !!row['_11_7'],
          },
          {
            target: _target11_a,
            value: !!row['_11_a'] ? parseFloat(row['_11_a']) : null,
            exists: !!row['_11_a'],
          },
          {
            target: _target11_b,
            value: !!row['_11_b'] ? parseFloat(row['_11_b']) : null,
            exists: !!row['_11_b'],
          },
          {
            target: _target11_c,
            value: !!row['_11_c'] ? parseFloat(row['_11_c']) : null,
            exists: !!row['_11_c'],
          },
        ],
      };

      dataSourceMapping.unsdgs.push(unsdg11);

      const unsdg12: IUnsdgMapItem = {
        unsdg: _unsdg12,
        value: !!row['Responsible Consumption and Production'] ? parseFloat(row['Responsible Consumption and Production']) : null,
        exists: !!row['Responsible Consumption and Production'],
        targets: [
          {
            target: _target12_1,
            value: !!row['_12_1'] ? parseFloat(row['_12_1']) : null,
            exists: !!row['_12_1'],
          },
          {
            target: _target12_2,
            value: !!row['_12_2'] ? parseFloat(row['_12_2']) : null,
            exists: !!row['_12_2'],
          },
          {
            target: _target12_3,
            value: !!row['_12_3'] ? parseFloat(row['_12_3']) : null,
            exists: !!row['_12_3'],
          },
          {
            target: _target12_4,
            value: !!row['_12_4'] ? parseFloat(row['_12_4']) : null,
            exists: !!row['_12_4'],
          },
          {
            target: _target12_5,
            value: !!row['_12_5'] ? parseFloat(row['_12_5']) : null,
            exists: !!row['_12_5'],
          },
          {
            target: _target12_6,
            value: !!row['_12_6'] ? parseFloat(row['_12_6']) : null,
            exists: !!row['_12_6'],
          },
          {
            target: _target12_7,
            value: !!row['_12_7'] ? parseFloat(row['_12_7']) : null,
            exists: !!row['_12_7'],
          },
          {
            target: _target12_8,
            value: !!row['_12_8'] ? parseFloat(row['_12_8']) : null,
            exists: !!row['_12_8'],
          },
          {
            target: _target12_a,
            value: !!row['_12_a'] ? parseFloat(row['_12_a']) : null,
            exists: !!row['_12_a'],
          },
          {
            target: _target12_b,
            value: !!row['_12_b'] ? parseFloat(row['_12_b']) : null,
            exists: !!row['_12_b'],
          },
          {
            target: _target12_c,
            value: !!row['_12_c'] ? parseFloat(row['_12_c']) : null,
            exists: !!row['_12_c'],
          },
        ],
      };

      dataSourceMapping.unsdgs.push(unsdg12);

      const unsdg13: IUnsdgMapItem = {
        unsdg: _unsdg13,
        value: !!row['Climate Action'] ? parseFloat(row['Climate Action']) : null,
        exists: !!row['Climate Action'],
        targets: [
          {
            target: _target13_1,
            value: !!row['_13_1'] ? parseFloat(row['_13_1']) : null,
            exists: !!row['_13_1'],
          },
          {
            target: _target13_2,
            value: !!row['_13_2'] ? parseFloat(row['_13_2']) : null,
            exists: !!row['_13_2'],
          },
          {
            target: _target13_3,
            value: !!row['_13_3'] ? parseFloat(row['_13_3']) : null,
            exists: !!row['_13_3'],
          },
          {
            target: _target13_a,
            value: !!row['_13_a'] ? parseFloat(row['_13_a']) : null,
            exists: !!row['_13_a'],
          },
          {
            target: _target13_b,
            value: !!row['_13_b'] ? parseFloat(row['_13_b']) : null,
            exists: !!row['_13_b'],
          },
        ],
      };

      dataSourceMapping.unsdgs.push(unsdg13);

      const unsdg14: IUnsdgMapItem = {
        unsdg: _unsdg14,
        value: !!row['Life Below Water'] ? parseFloat(row['Life Below Water']) : null,
        exists: !!row['Life Below Water'],
        targets: [
          {
            target: _target14_1,
            value: !!row['_14_1'] ? parseFloat(row['_14_1']) : null,
            exists: !!row['_14_1'],
          },
          {
            target: _target14_2,
            value: !!row['_14_2'] ? parseFloat(row['_14_2']) : null,
            exists: !!row['_14_2'],
          },
          {
            target: _target14_3,
            value: !!row['_14_3'] ? parseFloat(row['_14_3']) : null,
            exists: !!row['_14_3'],
          },
          {
            target: _target14_4,
            value: !!row['_14_4'] ? parseFloat(row['_14_4']) : null,
            exists: !!row['_14_4'],
          },
          {
            target: _target14_5,
            value: !!row['_14_5'] ? parseFloat(row['_14_5']) : null,
            exists: !!row['_14_5'],
          },
          {
            target: _target14_6,
            value: !!row['_14_6'] ? parseFloat(row['_14_6']) : null,
            exists: !!row['_14_6'],
          },
          {
            target: _target14_7,
            value: !!row['_14_7'] ? parseFloat(row['_14_7']) : null,
            exists: !!row['_14_7'],
          },
          {
            target: _target14_a,
            value: !!row['_14_a'] ? parseFloat(row['_14_a']) : null,
            exists: !!row['_14_a'],
          },
          {
            target: _target14_b,
            value: !!row['_14_b'] ? parseFloat(row['_14_b']) : null,
            exists: !!row['_14_b'],
          },
          {
            target: _target14_c,
            value: !!row['_14_c'] ? parseFloat(row['_14_c']) : null,
            exists: !!row['_14_c'],
          },
        ],
      };

      dataSourceMapping.unsdgs.push(unsdg14);

      const unsdg15: IUnsdgMapItem = {
        unsdg: _unsdg15,
        value: !!row['Life on Land'] ? parseFloat(row['Life on Land']) : null,
        exists: !!row['Life on Land'],
        targets: [
          {
            target: _target15_1,
            value: !!row['_15_1'] ? parseFloat(row['_15_1']) : null,
            exists: !!row['_15_1'],
          },
          {
            target: _target15_2,
            value: !!row['_15_2'] ? parseFloat(row['_15_2']) : null,
            exists: !!row['_15_2'],
          },
          {
            target: _target15_3,
            value: !!row['_15_3'] ? parseFloat(row['_15_3']) : null,
            exists: !!row['_15_3'],
          },
          {
            target: _target15_4,
            value: !!row['_15_4'] ? parseFloat(row['_15_4']) : null,
            exists: !!row['_15_4'],
          },
          {
            target: _target15_5,
            value: !!row['_15_5'] ? parseFloat(row['_15_5']) : null,
            exists: !!row['_15_5'],
          },
          {
            target: _target15_6,
            value: !!row['_15_6'] ? parseFloat(row['_15_6']) : null,
            exists: !!row['_15_6'],
          },
          {
            target: _target15_7,
            value: !!row['_15_7'] ? parseFloat(row['_15_7']) : null,
            exists: !!row['_15_7'],
          },
          {
            target: _target15_8,
            value: !!row['_15_8'] ? parseFloat(row['_15_8']) : null,
            exists: !!row['_15_8'],
          },
          {
            target: _target15_9,
            value: !!row['_15_9'] ? parseFloat(row['_15_9']) : null,
            exists: !!row['_15_9'],
          },
          {
            target: _target15_a,
            value: !!row['_15_a'] ? parseFloat(row['_15_a']) : null,
            exists: !!row['_15_a'],
          },
          {
            target: _target15_b,
            value: !!row['_15_b'] ? parseFloat(row['_15_b']) : null,
            exists: !!row['_15_b'],
          },
          {
            target: _target15_c,
            value: !!row['_15_c'] ? parseFloat(row['_15_c']) : null,
            exists: !!row['_15_c'],
          },
        ],
      };

      dataSourceMapping.unsdgs.push(unsdg15);

      const unsdg16: IUnsdgMapItem = {
        unsdg: _unsdg16,
        value: !!row['Peace, Justice and Strong Institutions'] ? parseFloat(row['Peace, Justice and Strong Institutions']) : null,
        exists: !!row['Peace, Justice and Strong Institutions'],
        targets: [
          {
            target: _target16_1,
            value: !!row['_16_1'] ? parseFloat(row['_16_1']) : null,
            exists: !!row['_16_1'],
          },
          {
            target: _target16_2,
            value: !!row['_16_2'] ? parseFloat(row['_16_2']) : null,
            exists: !!row['_16_2'],
          },
          {
            target: _target16_3,
            value: !!row['_16_3'] ? parseFloat(row['_16_3']) : null,
            exists: !!row['_16_3'],
          },
          {
            target: _target16_4,
            value: !!row['_16_4'] ? parseFloat(row['_16_4']) : null,
            exists: !!row['_16_4'],
          },
          {
            target: _target16_5,
            value: !!row['_16_5'] ? parseFloat(row['_16_5']) : null,
            exists: !!row['_16_5'],
          },
          {
            target: _target16_6,
            value: !!row['_16_6'] ? parseFloat(row['_16_6']) : null,
            exists: !!row['_16_6'],
          },
          {
            target: _target16_7,
            value: !!row['_16_7'] ? parseFloat(row['_16_7']) : null,
            exists: !!row['_16_7'],
          },
          {
            target: _target16_8,
            value: !!row['_16_8'] ? parseFloat(row['_16_8']) : null,
            exists: !!row['_16_8'],
          },
          {
            target: _target16_9,
            value: !!row['_16_9'] ? parseFloat(row['_16_9']) : null,
            exists: !!row['_16_9'],
          },
          {
            target: _target16_10,
            value: !!row['_16_10'] ? parseFloat(row['_16_10']) : null,
            exists: !!row['_16_10'],
          },
          {
            target: _target16_a,
            value: !!row['_16_a'] ? parseFloat(row['_16_a']) : null,
            exists: !!row['_16_a'],
          },
          {
            target: _target16_b,
            value: !!row['_16_b'] ? parseFloat(row['_16_b']) : null,
            exists: !!row['_16_b'],
          },
        ],
      };

      dataSourceMapping.unsdgs.push(unsdg16);

      const unsdg17: IUnsdgMapItem = {
        unsdg: _unsdg17,
        value: !!row['Partnerships for the Goals'] ? parseFloat(row['Partnerships for the Goals']) : null,
        exists: !!row['Partnerships for the Goals'],
        targets: [
          {
            target: _target17_1,
            value: null,
            exists: false,
          },
          {
            target: _target17_2,
            value: null,
            exists: false,
          },
          {
            target: _target17_3,
            value: null,
            exists: false,
          },
          {
            target: _target17_4,
            value: null,
            exists: false,
          },
          {
            target: _target17_5,
            value: null,
            exists: false,
          },
          {
            target: _target17_6,
            value: null,
            exists: false,
          },
          {
            target: _target17_7,
            value: null,
            exists: false,
          },
          {
            target: _target17_8,
            value: null,
            exists: false,
          },
          {
            target: _target17_9,
            value: !!row['_17_9'] ? parseFloat(row['_17_9']) : null,
            exists: !!row['_17_9'],
          },
          {
            target: _target17_10,
            value: null,
            exists: false,
          },
          {
            target: _target17_11,
            value: null,
            exists: false,
          },
          {
            target: _target17_12,
            value: null,
            exists: false,
          },
          {
            target: _target17_13,
            value: null,
            exists: false,
          },
          {
            target: _target17_14,
            value: null,
            exists: false,
          },
          {
            target: _target17_15,
            value: null,
            exists: false,
          },
          {
            target: _target17_16,
            value: null,
            exists: false,
          },
          {
            target: _target17_17,
            value: null,
            exists: false,
          },
          {
            target: _target17_18,
            value: null,
            exists: false,
          },
          {
            target: _target17_19,
            value: null,
            exists: false,
          },
        ],
      };

      dataSourceMapping.unsdgs.push(unsdg17);

      await dataSourceMapping.save();

      count += 1;
    } catch (err) {
      errorCount += 1;
      console.log(`\n[-] error creating dataSourceMapping for ${row.name}`);
      console.log(err, '\n');
    }
  }

  if (errorCount > 0) {
    if (count === 0) {
      console.log(`\n[-] ${errorCount} errors occurred while mapping data sources\n`);
    } else {
      console.log(`\n[-] ${count} data sources mapped but with ${errorCount} errors\n`);
    }
  } else if (count === 0) {
    console.log('\n[*] no data sources mapped\n');
  } else {
    console.log(`\n[+] ${count} data sources mapped successfully\n`);
  }
};
