import {Component, inject, Input, OnInit} from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {Metadata} from '../../models/metadata.model';
import {ModsParserService} from '../../services/mods-parser.service';

@Component({
  selector: 'app-metadata-section',
	imports: [
		NgForOf,
		NgIf,
		TranslatePipe,
	],
  templateUrl: './metadata-section.html',
  styleUrl: './metadata-section.scss'
})
export class MetadataSection implements OnInit {

  data: Metadata | null = null;

  modsParser = inject(ModsParserService);

  @Input() uuid: string = '';

  ngOnInit() {
    this.loadMetadata();
  }

  async loadMetadata() {
    this.modsParser
      .getMods(this.uuid)
      .then((metadata: Metadata) => {
        this.data = metadata;
      });
  }

  objectKeys = Object.keys;

}
