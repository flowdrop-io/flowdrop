import type { FlowDropSkin, FlowDropSkinName } from '../types/skin';
import { defaultSkin } from './default';
import { slateSkin } from './slate';

const builtinSkins: Record<FlowDropSkinName, FlowDropSkin> = {
	default: defaultSkin,
	slate: slateSkin
};

/**
 * Resolve a skin prop to a complete FlowDropSkin object.
 *
 * When an object with inline tokens is provided alongside a named base skin,
 * the inline tokens are merged on top of the named skin's tokens:
 *   resolveSkin({ name: 'minimal', tokens: { primary: '#e11d48' } })
 *   → minimal skin tokens + { primary: '#e11d48' }
 */
export function resolveSkin(skin: FlowDropSkin | FlowDropSkinName | undefined): FlowDropSkin {
	if (!skin || skin === 'default') return defaultSkin;
	if (typeof skin === 'string') return builtinSkins[skin as FlowDropSkinName] ?? defaultSkin;

	// Object form — check for a named base to merge on top of
	const baseName = (skin as FlowDropSkin & { name?: string }).name as
		| FlowDropSkinName
		| undefined;
	if (baseName && baseName !== 'default' && builtinSkins[baseName]) {
		const base = builtinSkins[baseName];
		return {
			tokens: { ...(base.tokens ?? {}), ...(skin.tokens ?? {}) }
		};
	}

	return skin;
}

export { defaultSkin, slateSkin };
