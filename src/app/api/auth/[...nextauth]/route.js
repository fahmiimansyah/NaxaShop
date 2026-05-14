import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import db from "../../../lib/db"; // Colokan kulkas lu

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Akun NaXaShop",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // 1. Satpam nyari email di Kulkas
        const [users] = await db.query("SELECT * FROM users WHERE email = ?", [credentials.email]);
        const user = users[0];

        // Kalo email ga ada, satpam nolak
        if (!user) throw new Error("Email belum kedaftar bre!");

        // 2. Satpam nyocokin password asli vs password alien
        const passwordCocok = await bcrypt.compare(credentials.password, user.password);
        
        // Kalo beda, satpam nolak
        if (!passwordCocok) throw new Error("Password lu salah bre!");

        // 3. Kalo cocok semua, satpam ngasih Kartu Akses!
        return { 
          id: user.id, 
          name: user.nama, 
          email: user.email, 
          role: user.role 
        };
      }
    })
  ],
  session: { strategy: "jwt" }, // Kartu akses digital
  pages: { signIn: '/login' }, // Kalo belum login, lempar ke halaman ini
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };