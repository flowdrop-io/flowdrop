import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { runtimeConfig } = await parent();
  return { runtimeConfig };
};
