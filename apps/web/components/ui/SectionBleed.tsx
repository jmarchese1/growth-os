/**
 * Gradient bleed strip between sections with contrasting backgrounds.
 * from / to: CSS color values (e.g. '#030712', '#ffffff')
 */
interface Props {
  from: string;
  to: string;
  height?: number; // px
}

export default function SectionBleed({ from, to, height = 80 }: Props) {
  return (
    <div
      aria-hidden
      style={{
        height,
        background: `linear-gradient(to bottom, ${from}, ${to})`,
        marginTop: -1,
        marginBottom: -1,
        position: 'relative',
        zIndex: 10,
      }}
    />
  );
}
