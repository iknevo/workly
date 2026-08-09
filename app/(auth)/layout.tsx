import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}
export default function AuthLayout({ children }: Props) {
  return <div className="flex min-h-screen items-center justify-center">{children}</div>;
}
