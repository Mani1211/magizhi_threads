import { DEMO } from '../config';
import { createAppwriteApi } from './appwriteApi';
import { createDemoApi } from './demoApi';
import type { Api } from './types';

export const api: Api = DEMO ? createDemoApi() : createAppwriteApi();
