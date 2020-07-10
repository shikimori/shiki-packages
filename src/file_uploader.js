import { bind } from 'decko';
import uEvent from 'uevent';
import isVisible from 'is-visible';

import Uppy from '@uppy/core';
import XHRUpload from '@uppy/xhr-upload';

import fixChromeDocEvent from './utils/fix_chrome_doc_event';
import notFiles from './utils/not_files';

import flash from './flash';
import ruLocale from './locale/ru';

const I18N_KEY = 'frontend.lib.file_uploader';

export default class FileUploader {
  uploadIDs = []
  docLeaveTimer = null
  progressNode = null
  progressNodeBar = null
  dropNode = null

  isEnabled = true

  defaultOptions = {
    node: null,
    progressContainerNode: null,
    locale: null,
    xhrEndpoint: null,
    xhrHeaders: null,
    xhrFieldName: 'image',
    maxNumberOfFiles: 150
  }

  constructor(options) {
    Object.assign(
      this,
      this.defaultOptions,
      options
    );
    uEvent.mixin(this);

    this.uppy = this._initUppy();
    this._bindDragEvents();
    this._addProgressNode();

    this._bindInput();
  }

  @bind
  destroy() {
    this._removeProgressNode();
    this._unbindDragEvents();
  }

  disable() {
    if (!this.isEnabled) { return; }

    this.isEnabled = false;
    this._unbindDragEvents();
  }

  enable() {
    if (this.isEnabled) { return; }

    this.isEnabled = true;
    this._bindDragEvents();
  }

  get filesUploadedCount() {
    return this.uploadIDs.reduce((memo, id) => {
      const file = this.uppy.store.state.files[id];
      const isComplete = !!(file.error || file.progress.percentage === 100);

      return memo + (isComplete ? 1 : 0);
    }, 0);
  }

  get bytesTotal() {
    return this.uploadIDs.reduce((memo, id) => (
      memo +
        this.uppy.store.state.files[id].progress.bytesTotal
    ), 0);
  }

  get bytesUploaded() {
    return this.uploadIDs.reduce((memo, id) => (
      memo +
        this.uppy.store.state.files[id].progress.bytesUploaded
    ), 0);
  }

  addFiles(files) {
    Array
      .from(files)
      .slice(0, this.maxNumberOfFiles + 1)
      .forEach(file => {
        try {
          this.uppy.addFile({ name: file.name, type: file.type, data: file });
        } catch (error) {
          this.uppy.log(error);
        }
      });
  }

  _bindInput() {
    const inputNode = this.node.querySelector('input[type=file]');
    if (!inputNode) { return; }

    inputNode.addEventListener('change', ({ currentTarget }) => {
      this.addFiles(currentTarget.files);
    });
  }

  _bindDragEvents() {
    document.addEventListener('dragenter', this._docEnter);
    document.addEventListener('dragleave', this._docLeave);
    document.addEventListener('dragover', this._docOver);
    document.addEventListener('drop', this._docDrop);
  }

  _unbindDragEvents() {
    document.removeEventListener('drop', this._docDrop);
    document.removeEventListener('dragenter', this._docEnter);
    document.removeEventListener('dragover', this._docOver);
    document.removeEventListener('dragleave', this._docLeave);
  }

  _initUppy() {
    return Uppy({
      // id: 'uppy',
      autoProceed: true,
      allowMultipleUploads: true,
      // debug: true,
      restrictions: {
        maxFileSize: 1024 * 1024 * 4,
        maxNumberOfFiles: this.maxNumberOfFiles,
        minNumberOfFiles: null,
        allowedFileTypes: ['image/jpg', 'image/jpeg', 'image/png']
      },
      locale: this.locale === 'ru' ? ruLocale : undefined
    })
      .use(XHRUpload, {
        endpoint: this.xhrEndpoint,
        fieldName: this.xhrFieldName,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          ...this.xhrHeaders()
        },
        limit: 1 // prevent concurrent upload - this breaks screenshots upload order
      })
      // https://uppy.io/docs/uppy/#file-added
      .on('upload', this._uploadStart)
      .on('upload-success', this._uploadSuccess)
      .on('upload-progress', this._uploadProgress)
      .on('complete', this._uploadComplete)
      .on('upload-error', this._uploadError)
      .on('restriction-failed', (_file, error) => flash.error(error.message));
  }

  _addDropNode() {
    if (this.dropNode || !isVisible(this.node)) { return; }

    const height = this.node.offsetHeight;
    const width = this.node.offsetWidth;
    const text = I18n.t(`${I18N_KEY}.drop_pictures_here`);

    this.dropNode = document.createElement('div');
    this.dropNode.classList.add('shiki-file_uploader-drop_placeholder');
    this.dropNode.setAttribute('data-text', text);
    this.dropNode.style = [
      `width: ${width}px !important`,
      `height: ${height}px`,
      `line-height: ${Math.max(height, 75)}px`,
      'opacity: 0'
    ].join(';');
    this.dropNode.addEventListener('drop', this._dragDrop);
    this.dropNode.addEventListener('dragenter', () =>
      this.dropNode.classList.add('hovered')
    );
    this.dropNode.addEventListener('dragleave', () =>
      this.dropNode.classList.remove('hovered')
    );

    this.node.parentNode.insertBefore(this.dropNode, this.node);

    requestAnimationFrame(() =>
      this.dropNode.style.opacity = 0.75
    );
  }

  _addProgressNode() {
    if (this.progressNode || !isVisible(this.node)) { return; }

    this.progressNode = document.createElement('div');
    this.progressNodeBar = document.createElement('div');

    this.progressNode.classList.add('shiki-file_uploader-upload_progress');
    this.progressNodeBar.classList.add('bar');

    this.progressNode.appendChild(this.progressNodeBar);

    if (this.progressContainerNode) {
      this.progressContainerNode.appendChild(this.progressNode);
    } else {
      this.node.parentNode.insertBefore(this.progressNode, this.node);
    }
  }

  @bind
  _removeDropNode() {
    if (!this.dropNode) { return; }
    const { dropNode } = this;

    this.dropNode = null;

    dropNode.style.opacity = 0;
    setTimeout(() => dropNode.remove(), 350);
  }

  _removeProgressNode() {
    if (!this.progressNode) { return; }

    this.progressNode.remove();

    this.progressNode = null;
    this.progressNodeBar = null;
  }

  @bind
  _uploadStart(data) {
    this.uploadIDs = this.uploadIDs.concat(data.fileIDs);

    this.progressNode.classList.add('active');
    this.progressNodeBar.style.width = '0%';
  }

  @bind
  _uploadProgress(file, _progress) {
    let text;

    if (this.uploadIDs.length === 1) {
      text = I18n.t(`${I18N_KEY}.uploading_file`, {
        filename: file.name,
        filesize: Math.ceil(file.size / 1024)
      });
    } else {
      text = I18n.t(`${I18N_KEY}.uploading_files`, {
        uploadedCount: Math.min(this.filesUploadedCount + 1, this.uploadIDs.length),
        totalCount: this.uploadIDs.length,
        kbUploaded: Math.ceil(this.bytesUploaded / 1024),
        kbTotal: Math.ceil(this.bytesTotal / 1024)
      });
    }
    this.progressNode.setAttribute('data-progress', text);
    this.progressNodeBar.innerText = text;

    const percent = this.bytesUploaded * 100.0 / this.bytesTotal;
    this.progressNodeBar.style.width = `${percent}%`;
  }

  @bind
  _uploadSuccess(_file, response) {
    this.trigger('upload:file:success', response.body);
  }

  @bind
  _uploadComplete({ successful }) {
    if (this.filesUploadedCount !== this.uploadIDs.length) { return; }

    this.uploadIDs = [];

    if (successful.length) {
      this.trigger('upload:complete');
    } else {
      this.trigger('upload:failure');
    }

    this.progressNode.classList.remove('active');
  }

  @bind
  _uploadError(file, error, _response) {
    let message;

    if (error.message === 'Upload error') {
      message = this.uppy.i18n('failedToUpload', { file: file.name });
    } else {
      message = error.message; // eslint-disable-line
    }

    flash.error(message);
  }

  @bind
  _dragDrop(e) {
    e.preventDefault();
    // e.stopPropagation();

    this.addFiles(e.dataTransfer.files);
    this._docLeave();
  }

  @bind
  _docDrop(e) {
    if (!this.dropNode) { return; }

    e.stopPropagation();
    e.preventDefault();

    this._docLeave();
  }

  @bind
  _docEnter(e) {
    if (notFiles(e)) { return; }

    e.stopPropagation();
    e.preventDefault();

    this._addDropNode();

    clearTimeout(this.docLeaveTimer);
  }

  @bind
  _docOver(e) {
    if (!this.dropNode) { return; }

    fixChromeDocEvent(e);
    e.stopPropagation();
    e.preventDefault();

    clearTimeout(this.docLeaveTimer);
    this.docLeaveTimer = null;
  }

  @bind
  _docLeave(e) {
    if (!this.dropNode) { return; }

    if (e) {
      e.stopPropagation();
      e.preventDefault();

      this.docLeaveTimer = setTimeout(this._removeDropNode, 200);
    } else {
      this._removeDropNode();
    }
  }
}
