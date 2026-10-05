export interface SvgColor {
    color: string;
    opacity?: number;
}

export function parseSvgColor(colorStr: string | undefined, fallback: string = 'none'): SvgColor {
    if (!colorStr) {
        return { color: fallback };
    }
    const trimmed = colorStr.trim();
    if (trimmed === 'transparent' || trimmed === 'none' || trimmed === '#00000000') {
        return { color: 'none' };
    }
    if (trimmed.startsWith('var(')) {
        return { color: fallback };
    }

    const hex8Match = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(trimmed);
    if (hex8Match) {
        const r = hex8Match[1];
        const g = hex8Match[2];
        const b = hex8Match[3];
        const a = parseInt(hex8Match[4], 16) / 255;
        if (a === 0) {
            return { color: 'none' };
        }
        return {
            color: `#${r}${g}${b}`,
            opacity: Math.round(a * 1000) / 1000
        };
    }

    const hex4Match = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(trimmed);
    if (hex4Match) {
        const r = hex4Match[1] + hex4Match[1];
        const g = hex4Match[2] + hex4Match[2];
        const b = hex4Match[3] + hex4Match[3];
        const a = parseInt(hex4Match[4] + hex4Match[4], 16) / 255;
        if (a === 0) {
            return { color: 'none' };
        }
        return {
            color: `#${r}${g}${b}`,
            opacity: Math.round(a * 1000) / 1000
        };
    }

    const rgbaMatch = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(trimmed);
    if (rgbaMatch) {
        const a = parseFloat(rgbaMatch[4]);
        if (a === 0) {
            return { color: 'none' };
        }
        return {
            color: `rgb(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]})`,
            opacity: a
        };
    }

    return { color: trimmed };
}

export function getSvgFillAttributes(colorStr: string | undefined, fallback: string = 'none'): string {
    const parsed = parseSvgColor(colorStr, fallback);
    if (parsed.color === 'none') {
        return 'fill="none"';
    }
    let attr = `fill="${parsed.color}"`;
    if (parsed.opacity !== undefined && parsed.opacity < 1) {
        attr += ` fill-opacity="${parsed.opacity}"`;
    }
    return attr;
}

export function getSvgStrokeAttributes(
    colorStr: string | undefined,
    borderStyle: string | undefined,
    fallback: string = '#000000'
): string {
    if (borderStyle === 'none') {
        return 'stroke="none"';
    }
    const parsed = parseSvgColor(colorStr, fallback);
    if (parsed.color === 'none') {
        return 'stroke="none"';
    }
    let attr = `stroke="${parsed.color}"`;
    if (parsed.opacity !== undefined && parsed.opacity < 1) {
        attr += ` stroke-opacity="${parsed.opacity}"`;
    }
    return attr;
}

export function getStrokeDashArray(
    borderStyle: string | undefined,
    defaultStyle: string = 'solid'
): string {
    const style = borderStyle || defaultStyle;
    if (style === 'dashed') return '5,5';
    if (style === 'dotted') return '2,2';
    return '';
}

export function getSvgBackgroundStyle(colorStr: string | undefined): string {
    const parsed = parseSvgColor(colorStr, 'none');
    if (parsed.color === 'none') {
        return '';
    }
    if (parsed.opacity !== undefined && parsed.opacity < 1) {
        return ` style="background-color: ${parsed.color}; opacity: ${parsed.opacity};"`;
    }
    return ` style="background-color: ${parsed.color};"`;
}
