import { ReactNode, memo } from "react";

export function Comp(props: { children: () => ReactNode }): ReactNode {
  return props.children();
}

export const MComp = memo(Comp);
