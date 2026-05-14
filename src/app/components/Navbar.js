import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import NavbarUI from "../components/NavbarUI";

export default async function Navbar() {
  // 1. Ngecek KTP di sisi Server (Aman dari error)
  const session = await getServerSession(authOptions);

  // 2. Oper KTP-nya ke komponen UI lu yang glowing itu
  return <NavbarUI session={session} />;
}