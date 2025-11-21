import { db } from './src/client';
import { users } from './src/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

async function initAdmin() {
  try {
    console.log('Checking for admin user...');
    
    const existingAdmin = await db.select().from(users).where(eq(users.email, 'admin@careforall.com')).limit(1);
    
    if (existingAdmin.length === 0) {
      console.log('Creating admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await db.insert(users).values({
        email: 'admin@careforall.com',
        password: hashedPassword,
        role: 'admin'
      });
      
      console.log('✓ Admin user created: admin@careforall.com (password: admin123)');
    } else {
      console.log('✓ Admin user already exists');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error initializing admin:', error);
    process.exit(1);
  }
}

initAdmin();
