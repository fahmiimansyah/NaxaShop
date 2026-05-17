import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import db from "../../../lib/db";

export const authOptions = {
  providers: [
    // LOGIN MANUAL: EMAIL + PASSWORD
    CredentialsProvider({
      name: "Akun NaXaShop",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email dan password wajib diisi bre!");
        }

        const email = credentials.email.trim().toLowerCase();

        const [users] = await db.query(
          `SELECT id, nama, email, password, role, provider, email_verified
           FROM users
           WHERE email = ?
           LIMIT 1`,
          [email]
        );

        const user = users[0];

        if (!user) {
          throw new Error("Email belum kedaftar bre!");
        }

        // Akun manual wajib verifikasi email dulu
        if (!user.email_verified) {
          throw new Error("Email lu belum diverifikasi bre! Cek inbox dulu.");
        }

        // Kalau password NULL, berarti akun ini dibuat via Google
        if (!user.password) {
          throw new Error("Akun ini login pakai Google bre!");
        }

        const passwordCocok = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!passwordCocok) {
          throw new Error("Password lu salah bre!");
        }
        await db.query(
  `UPDATE users SET last_login_at = NOW() WHERE id = ?`,
  [user.id]
);

        return {
          id: String(user.id),
          name: user.nama,
          email: user.email,
          role: user.role || "user"
        };
      }
    }),

    // LOGIN GOOGLE
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  ],

  session: {
    strategy: "jwt"
  },

  pages: {
    signIn: "/login"
  },

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async signIn({ user, account }) {
      try {
        // Kalau login manual Credentials, langsung lolos.
        // Validasi manual sudah dikerjain di authorize().
        if (account?.provider === "credentials") {
          return true;
        }

        // Kalau login Google
        const email = user.email?.trim().toLowerCase();
        const nama = user.name || "User";
        const foto = user.image || null;
        const provider = account?.provider || "google";

        if (!email) {
          return false;
        }

        const [userLama] = await db.query(
          `SELECT id, role
           FROM users
           WHERE email = ?
           LIMIT 1`,
          [email]
        );

        // Kalau user Google belum ada, daftarin otomatis
        if (userLama.length === 0) {
          await db.query(
  `INSERT INTO users
   (nama, email, password, provider, foto, role, email_verified, last_login_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
  [nama, email, null, provider, foto, "user", 1]
);
        } else {
          // Kalau email sudah ada, update data Google-nya
          // Sekalian set email_verified = 1 karena Google sudah verifikasi emailnya
          await db.query(
            `UPDATE users
             SET nama = ?,
                 provider = ?,
                 foto = ?,
                 email_verified = 1,
                 last_login_at = NOW()
             WHERE email = ?`,
            [nama, provider, foto, email]
          );
        }

        return true;
      } catch (error) {
        console.error("OAuth signIn error:", error);
        return false;
      }
    },

    async jwt({ token, user }) {
      // Saat baru login manual, user dari authorize() ada
      if (user) {
        token.id = user.id;
        token.role = user.role || "user";
      }

      // Ambil id + role terbaru dari database
      // Ini penting buat Google login juga
      if (token.email) {
        const [users] = await db.query(
          `SELECT id, role
           FROM users
           WHERE email = ?
           LIMIT 1`,
          [token.email]
        );

        if (users.length > 0) {
          token.id = String(users[0].id);
          token.role = users[0].role || "user";
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role || "user";
      }

      return session;
    }
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };