import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from './services/supabase.service';
import { StoreService } from './services/store.service';
import { Login } from './auth/login';
import { Icon } from './shared/icon';
import { EditDialog } from './shared/edit-dialog';
import { MembersDialog } from './shared/members-dialog';
import { PageHeader } from './sections/page-header';
import { Finishes } from './sections/finishes';
import { DosDonts } from './sections/dos-donts';
import { InspirationGallery } from './sections/inspiration';
import { Plans } from './sections/plans';
import { CanvaDesigns } from './sections/canva-designs';
import { Costs } from './sections/costs';
import { Builders } from './sections/builders';

@Component({
  selector: 'app-root',
  imports: [
    FormsModule, Login, Icon, EditDialog, MembersDialog, PageHeader, Finishes, DosDonts,
    InspirationGallery, Plans, CanvaDesigns, Costs, Builders,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  supabase = inject(SupabaseService);
  store = inject(StoreService);
  showMembers = signal(false);
  menuOpen = signal(false);
  newPassword = '';
  passwordMsg = signal('');

  nav = [
    { id: 'finishes', label: 'Finishes' },
    { id: 'dos-donts', label: 'Do’s & Don’ts' },
    { id: 'inspiration', label: 'Inspiration' },
    { id: 'plans', label: 'House Plans' },
    { id: 'canva', label: 'Canva Designs' },
    { id: 'budget', label: 'Budget & Costs' },
    { id: 'builders', label: 'Builders' },
  ];

  constructor() {
    // Load data as soon as we know the signed-in user is a household member.
    effect(() => {
      if (this.supabase.isMember()) this.store.loadAll();
    });
  }

  scrollTo(id: string) {
    this.menuOpen.set(false);
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
