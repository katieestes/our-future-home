import { Injectable, signal, computed } from '@angular/core';
import { createClient, Session } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../supabase.config';

/**
 * Wraps the Supabase client and keeps track of who is signed in.
 * Components read the signals (session, isMember) to decide what to show.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  /** null = signed out */
  readonly session = signal<Session | null>(null);
  /** true once we've checked for an existing session on page load */
  readonly ready = signal(false);
  /** null = not checked yet, true = in the household, false = signed in but not allowed */
  readonly isMember = signal<boolean | null>(null);

  /** true after someone opens a "reset password" email link */
  readonly recovering = signal(false);

  readonly email = computed(() => this.session()?.user.email ?? '');

  constructor() {
    this.client.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      this.ready.set(true);
      this.checkMembership();
    });

    this.client.auth.onAuthStateChange((event, session) => {
      this.session.set(session);
      if (event === 'PASSWORD_RECOVERY') this.recovering.set(true);
      // Supabase recommends not awaiting other Supabase calls inside this callback.
      setTimeout(() => this.checkMembership());
    });
  }

  /**
   * Asks the database whether this user belongs to the household.
   * The very first person to sign in automatically becomes a member.
   */
  async checkMembership(): Promise<void> {
    if (!this.session()) {
      this.isMember.set(null);
      return;
    }
    const { data, error } = await this.client.rpc('claim_household');
    this.isMember.set(!error && data === true);
  }

  /** Where Supabase should send people after they click an email link. */
  private get redirectUrl(): string {
    return window.location.origin + window.location.pathname;
  }

  signIn(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email, password });
  }

  signUp(email: string, password: string) {
    return this.client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: this.redirectUrl },
    });
  }

  sendPasswordReset(email: string) {
    return this.client.auth.resetPasswordForEmail(email, { redirectTo: this.redirectUrl });
  }

  updatePassword(password: string) {
    return this.client.auth.updateUser({ password });
  }

  signOut() {
    return this.client.auth.signOut();
  }
}
