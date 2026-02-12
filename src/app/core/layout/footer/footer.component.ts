import { Component, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { EnvironmentService } from '../../../shared/services/environment.service';
import { ConfigService } from '../../config';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  imports: [
    TranslatePipe,
  ],
  standalone: true,
})
export class FooterComponent implements OnInit {

  footerLogo: string = 'img/logo.svg';

  private gitCommitUrl: string | null = null;
  private logoClickCount = 0;
  private logoClickTimer: any = null;

  constructor(
    private envService: EnvironmentService,
    private configService: ConfigService,
  ) {}

  async ngOnInit() {
    const commitHash = this.envService.get('git_commit_hash');
    if (commitHash) {
      this.gitCommitUrl = 'https://github.com/trineracz/CDK-klient/commit/' + commitHash;
    }

    const activeLib = await this.configService.getActiveLibrary();
    if (activeLib) {
      this.footerLogo = activeLib.logo;
    } else {
      this.footerLogo = this.configService.app.logo || 'img/logo.svg';
    }
  }

  logoClicked() {
    if (!this.gitCommitUrl) return;

    this.logoClickCount++;

    if (this.logoClickTimer) {
      clearTimeout(this.logoClickTimer);
      this.logoClickTimer = null;
    }

    if (this.logoClickCount >= 5) {
      window.open(this.gitCommitUrl, '_blank');
      this.logoClickTimer = setTimeout(() => {
        this.logoClickCount = 0;
        this.logoClickTimer = null;
      }, 1000);
      return;
    }

    this.logoClickTimer = setTimeout(() => {
      this.logoClickCount = 0;
      this.logoClickTimer = null;
    }, 500);
  }
}
