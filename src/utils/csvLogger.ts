import RNFS from 'react-native-fs';

const DATASET_DIR = `${RNFS.ExternalDirectoryPath}/datasets`;

const buildHeader = () => {
  const slots = Array.from({ length: 36 }, (_, i) => `board_${i}`).join(',');
  return [
    'game_id',
    'move_index',
    'current_player_is_b',
    'phase_placement',
    'phase_placement_slide',
    'phase_movement',
    'hole_square_index',
    'blocked_slide_square_index',
    slots,
    'action_id',
    'result',
  ].join(',');
};

const ensuredFiles = new Set<string>();
const ensurePromises = new Map<string, Promise<void>>();

const ensureDatasetFile = async (filePath: string) => {
  if (ensuredFiles.has(filePath)) return;
  const existingPromise = ensurePromises.get(filePath);
  if (existingPromise) return existingPromise;
  const promise = (async () => {
    const dirExists = await RNFS.exists(DATASET_DIR);
    if (!dirExists) {
      await RNFS.mkdir(DATASET_DIR);
    }
    const fileExists = await RNFS.exists(filePath);
    if (!fileExists) {
      await RNFS.writeFile(filePath, `${buildHeader()}\n`, 'utf8');
    }
    ensuredFiles.add(filePath);
  })();
  ensurePromises.set(filePath, promise);
  return promise;
};

export const appendCsvRow = async (filePath: string, row: string) => {
  await ensureDatasetFile(filePath);
  await RNFS.appendFile(filePath, `${row}\n`, 'utf8');
};

export const appendCsvRows = async (filePath: string, rows: string[]) => {
  if (rows.length === 0) return;
  await ensureDatasetFile(filePath);
  await RNFS.appendFile(filePath, `${rows.join('\n')}\n`, 'utf8');
};

export const getDefaultCsvFilePath = () => `${DATASET_DIR}/games.csv`;
