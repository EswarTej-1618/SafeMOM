import { SVGProps } from "react";

const HospitalMapIcon = ({ className, ...props }: SVGProps<SVGSVGElement> & { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 110"
    fill="none"
    stroke="currentColor"
    strokeWidth="8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Map pin teardrop shape */}
    <path d="M50 10 C28 10 14 26 14 44 C14 66 50 96 50 96 C50 96 86 66 86 44 C86 26 72 10 50 10 Z" />
    {/* Medical cross inside */}
    <line x1="50" y1="28" x2="50" y2="60" strokeWidth="12" />
    <line x1="34" y1="44" x2="66" y2="44" strokeWidth="12" />
  </svg>
);

export default HospitalMapIcon;
