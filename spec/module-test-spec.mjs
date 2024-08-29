/**
 * Test file to ensure dyngoose can be loaded from esm
 *
 * If this fails node will error when running this with an error like
 * node:internal/process/esm_loader:74 internalBinding('errors').triggerUncaughtException(
 */
import { Dyngoose } from 'dyngoose'
import * as d from 'dyngoose/decorator'
import * as e from 'dyngoose/errors'
import * as q from 'dyngoose/query'
import * as u from 'dyngoose/utils'
