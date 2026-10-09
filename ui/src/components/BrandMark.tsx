import { brand } from '../theme.ts'

/** Brand logo: shows `brand.logoUrl` when set, else the `brand.mark` glyph. */
export function BrandMark() {
  return brand.logoUrl ? (
    <img className="brand-mark" src={brand.logoUrl} alt={brand.name} width={26} height={26} />
  ) : (
    <span className="brand-mark">{brand.mark}</span>
  )
}
