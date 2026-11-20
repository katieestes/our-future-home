import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';
import { Icon } from '../shared/icon';

type Mode = 'signin' | 'signup' | 'reset';

@Component({
  selector: 'app-login',
  imports: [FormsModule, Icon],
  template: `
    <main class="wrap">
      <div class="card-login">
        <div class="brand">
          <span class="logo"><app-icon name="home" [size]="26" [stroke]="1.6" /></span>
          <h1>Our Future Home</h1>
        </div>
        <p class="lead">
          @switch (mode()) {
            @case ('signin') { Sign in to your planning hub. }
            @case ('signup') { Create your account. The first person to sign up owns the hub and can invite others. }
            @case ('reset') { We'll email you a link to set a new password. }
          }
        </p>

        <form (ngSubmit)="submit()">
          <div class="field">
            <label for="email">Email</label>
            <input class="input" id="email" name="email" type="email" autocomplete="email"
              [(ngModel)]="email" required />
          </div>
          @if (mode() !== 'reset') {
            <div class="field">
              <label for="password">Password</label>
              <input class="input" id="password" name="password" type="password" minlength="8"
                [autocomplete]="mode() === 'signup' ? 'new-password' : 'current-password'"
                [(ngModel)]="password" required />
            </div>
          }

          @if (error()) { <p class="msg err" role="alert">{{ error() }}</p> }
          @if (notice()) { <p class="msg ok" role="status">{{ notice() }}</p> }

          <button class="btn btn-primary full" type="submit" [disabled]="busy()">
            @switch (mode()) {
              @case ('signin') { Sign in }
              @case ('signup') { Create account }
              @case ('reset') { Send reset link }
            }
          </button>
        </form>

        <div class="switch">
          @if (mode() === 'signin') {
            <button type="button" class="add-link" (click)="go('signup')">Create an account</button>
            <button type="button" class="add-link" (click)="go('reset')">Forgot password?</button>
          } @else {
            <button type="button" class="add-link" (click)="go('signin')">Back to sign in</button>
          }
        </div>
      </div>
    </main>
  `,
  styles: `
    .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card-login {
      width: min(420px, 100%); background: var(--surface); border: 1px solid var(--border);
      border-radius: 14px; padding: 32px; display: flex; flex-direction: column; gap: 16px;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .logo { width: 44px; height: 44px; border-radius: 10px; background: var(--clay-tint); color: var(--clay);
      display: flex; align-items: center; justify-content: center; }
    h1 { font-family: var(--font-display); font-weight: 600; font-size: 30px; }
    .lead { margin: 0; color: var(--text-2); }
    form { display: flex; flex-direction: column; gap: 14px; }
    .full { width: 100%; justify-content: center; min-height: 44px; }
    .msg { margin: 0; font-size: 13px; padding: 8px 10px; border-radius: 6px; }
    .err { background: var(--clay-wash); color: #8a2f19; }
    .ok { background: var(--sage-wash); color: var(--sage-text); }
    .switch { display: flex; justify-content: space-between; }
  `,
})
export class Login {
  private supabase = inject(SupabaseService);
  mode = signal<Mode>('signin');
  email = '';
  password = '';
  busy = signal(false);
  error = signal<string | null>(null);
  notice = signal<string | null>(null);

  go(mode: Mode) {
    this.mode.set(mode);
    this.error.set(null);
    this.notice.set(null);
  }

  async submit() {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    try {
      if (this.mode() === 'signin') {
        const { error } = await this.supabase.signIn(this.email, this.password);
        if (error) this.error.set(error.message);
      } else if (this.mode() === 'signup') {
        const { data, error } = await this.supabase.signUp(this.email, this.password);
        if (error) this.error.set(error.message);
        else if (!data.session)
          this.notice.set('Check your email to confirm your account, then come back and sign in.');
      } else {
        const { error } = await this.supabase.sendPasswordReset(this.email);
        if (error) this.error.set(error.message);
        else this.notice.set('If that email has an account, a reset link is on its way.');
      }
    } finally {
      this.busy.set(false);
    }
  }
}
