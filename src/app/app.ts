import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { SupabaseService } from './services/supabase.service';
import { StoreService } from './services/store.service';
import { Login } from './auth/login';
import { Icon } from './shared/icon';
import { EditDialog } from './shared/edit-dialog';
import { MembersDialog } from './shared/members-dialog';

@Component({
  selector: 'app-root',
  imports: [FormsModule, RouterOutlet, RouterLink, RouterLinkActive, Login, Icon, EditDialog, MembersDialog],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  supabase = inject(SupabaseService);
  store = inject(StoreService);
  private router = inject(Router);
  showMembers = signal(false);
  menuOpen = signal(false);
  newPassword = '';
  passwordMsg = signal('');

  /** Current URL path, e.g. "/plans/abc" — used for the breadcrumb. */
  private url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  crumbs = computed(() => {
    const url = this.url();
    const m = url.match(/^\/plans\/([^/?#]+)/);
    if (m) {
      const plan = this.store.rows.plans().find((p) => p.id === m[1]);
      return ['House Plans', plan?.name ?? 'Plan'];
    }
    if (url.startsWith('/plans')) return ['House Plans'];
    return ['Our Future Home'];
  });

  /** Dashboard sections you can jump to from the sidebar. */
  nav = [
    { id: 'finishes', label: 'Finishes' },
    { id: 'dos-donts', label: 'Do’s & Don’ts' },
    { id: 'inspiration', label: 'Inspiration' },
    { id: 'canva', label: 'Canva Designs' },
    { id: 'budget', label: 'Budget & Costs' },
    { id: 'builders', label: 'Builders' },
  ];

  constructor() {
    // Load data as soon as we know the signed-in user is a household member.
    effect(() => {
      if (this.supabase.isMember()) this.store.loadAll();
    });
    // Close the phone menu after navigating.
    effect(() => {
      this.url();
      this.menuOpen.set(false);
    });
  }

  /** Jump to a dashboard section (switching to the dashboard first if needed). */
  async scrollTo(id: string) {
    this.menuOpen.set(false);
    if (this.url() !== '/' && this.url() !== '') {
      await this.router.navigateByUrl('/');
      await new Promise((r) => setTimeout(r, 50));
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async setPassword() {
    const { error } = await this.supabase.updatePassword(this.newPassword);
    if (error) this.passwordMsg.set(error.message);
    else {
      this.supabase.recovering.set(false);
      this.newPassword = '';
    }
  }
}
