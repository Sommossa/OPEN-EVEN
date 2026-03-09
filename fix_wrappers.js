import fs from 'fs';
import path from 'path';

const wrapperTemplate = (componentName, isAuth = false) => `import React from "react";
import ${componentName} from "./${componentName}";
import { Navbar } from "../layout/Navbar";
import { AuthProvider } from "@/lib/auth/AuthContext";

export default function ${componentName}Wrapper() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] font-body selection:bg-primary/30">
        ${isAuth ? '' : '<Navbar />'}
        <main>
          <${componentName} />
        </main>
      </div>
    </AuthProvider>
  );
}
`;

const astroTemplate = (componentName, title) => `---
import Layout from '../layouts/Layout.astro';
import ${componentName}Wrapper from '../components/pages/${componentName}Wrapper';
---

<Layout title="${title}">
  <${componentName}Wrapper client:only="react" />
</Layout>
`;

const pages = [
    { name: 'Home', title: 'Home', astroFile: 'index.astro' },
    { name: 'SchedulePage', title: 'Schedule', astroFile: 'schedule.astro' },
    { name: 'Tickets', title: 'Tickets', astroFile: 'tickets.astro' },
    { name: 'Login', title: 'Login', astroFile: 'login.astro', isAuth: true },
    { name: 'Register', title: 'Register', astroFile: 'register.astro', isAuth: true },
];

pages.forEach(p => {
    const wrapperPath = path.join('/home/paris/Documents/OSW/OPEN EVEN-2026/src/components/pages', p.name + 'Wrapper.tsx');
    fs.writeFileSync(wrapperPath, wrapperTemplate(p.name, p.isAuth));

    const astroPath = path.join('/home/paris/Documents/OSW/OPEN EVEN-2026/src/pages', p.astroFile);
    fs.writeFileSync(astroPath, astroTemplate(p.name, p.title));
});

// Update ProfileWrapper and profile.astro manually
const profileWrapper = `import React from "react";
    import Profile from "./Profile";
    import { Navbar } from "../layout/Navbar";
    import { AuthProvider } from "@/lib/auth/AuthContext";

    export default function ProfileWrapper() {
        return (
            <AuthProvider>
                <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] font-body selection:bg-primary/30">
                    <Navbar />
                    <main>
                        <Profile />
                    </main>
                </div>
            </AuthProvider>
        );
    }
    `;
fs.writeFileSync('/home/paris/Documents/OSW/OPEN EVEN-2026/src/components/pages/ProfileWrapper.tsx', profileWrapper);

const profileAstro = `-- -
import Layout from '../layouts/Layout.astro';
    import ProfileWrapper from '../components/pages/ProfileWrapper';
    ---

        <Layout title="Profile">
            <ProfileWrapper client:only="react" />
        </Layout>
    `;
fs.writeFileSync('/home/paris/Documents/OSW/OPEN EVEN-2026/src/pages/profile.astro', profileAstro);

console.log('Successfully generated wrappers and updated astro files!');
