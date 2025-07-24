import { Injectable } from '@angular/core';
import { saveAs } from 'file-saver';

@Injectable({
  providedIn: 'root'
})
export class FileService {

  constructor() { }

  downloadFile(fileUrl: string, fileName: string): void {
    fetch(fileUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error('File download failed');
        }
        return response.blob();
      })
      .then(blob => {
        saveAs(blob, `${fileName}.mp3`);
      })
      .catch(error => {
        console.error('Download error:', error);
      });
  }
}
