import { db } from "../server/db";
import { users } from "../shared/schema";
import { hashPassword } from "../server/auth";

async function createSuperAdmin() {
  try {
    // Check if super admin already exists
    const existingSuperAdmin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.role, "super_admin")
    });

    if (existingSuperAdmin) {
      console.log("Super Admin already exists with username:", existingSuperAdmin.username);
      process.exit(0);
    }

    // Create super admin credentials
    const password = "Admin@123"; // Default password
    const hashedPassword = await hashPassword(password);

    // Insert super admin
    await db.insert(users).values({
      username: "superadmin",
      password: hashedPassword,
      email: "admin@corporatehierarchy.com",
      firstName: "Super",
      lastName: "Admin",
      role: "super_admin",
      companyId: null,
      managerId: null
    });

    console.log(`Super Admin created successfully!`);
    console.log(`Username: superadmin`);
    console.log(`Password: ${password}`);
    console.log(`Please change the password after first login.`);

  } catch (error) {
    console.error("Error creating Super Admin:", error);
  } finally {
    process.exit(0);
  }
}

createSuperAdmin();