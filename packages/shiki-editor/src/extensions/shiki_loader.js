import pDefer from 'p-defer';
import axios from 'axios';

import { flash } from 'shiki-utils';
import { debounce, throttle } from 'shiki-decorators';

import Extension from '../base/extension';
import fixUrl from '../utils/fix_url';

export const CACHE = {};
const QUEUE = {};

export class ShikiLoader extends Extension {
  API_PATH = 'api/shiki_editor'
  IDS_PER_REQUEST = 200

  get name() {
    return 'shiki_loader';
  }

  get defaultOptions() {
    return {
      baseUrl: undefined
    };
  }

  fetch({ id, type }) {
    const deferred = pDefer();

    QUEUE[convertToShikiType(type)] ||= {};
    (QUEUE[convertToShikiType(type)][id] ||= []).push(deferred);

    this.sendRequest();

    return deferred.promise;
  }

  resetCache({ id, type }) {
    const kind = convertToShikiType(type);

    if (CACHE[kind]?.[id] === null) {
      delete CACHE[kind][id];
    }
  }

  @debounce(50)
  @throttle(2000)
  sendRequest() {
    this.resolveFromCache();
    if (!Object.keys(QUEUE).length) { return; }

    let idsLimit = this.IDS_PER_REQUEST;

    const idsGetParams = Object.keys(QUEUE)
      .map(kind => {
        if (idsLimit <= 0) { return; }

        const ids = Object.keys(QUEUE[kind]).slice(0, idsLimit);
        idsLimit -= ids.length;

        return `${kind}=${ids.join(',')}`;
      })
      .filter(v => v)
      .join('&');

    axios
      .get(`${this.options.baseUrl}/${this.API_PATH}?${idsGetParams}`)
      .catch(_error => (
        flash.error(window.I18n.t('frontend.lib.please_try_again_later'))
      ))
      .then(result => this.process(result?.data));
  }

  process(results) {
    Object.keys(results).forEach(kind => {
      Object.keys(results[kind]).forEach(id => {
        const result = results[kind][id];

        if (result !== undefined) {
          if (result?.url) {
            result.url = fixUrl(result.url, this.options.baseUrl);
          }

          CACHE[kind] ||= {};
          CACHE[kind][id] ||= result;

          this.resolve(QUEUE[kind]?.[id], result, kind, id);
        }
      });
    });

    if (Object.keys(QUEUE).length) {
      this.sendRequest();
    }
  }

  resolveFromCache() {
    const toResolve = [];

    Object.keys(QUEUE).forEach(kind => {
      const queueById = QUEUE[kind];

      Object.keys(queueById).forEach(id => {
        const result = CACHE[kind]?.[id];
        if (result === undefined) { return; }

        toResolve.push({
          promises: queueById[id],
          result,
          kind,
          id
        });
      });
    });

    toResolve.forEach(({ promises, result, kind, id }) => (
      this.resolve(promises, result, kind, id)
    ));
  }

  resolve(promises, result, kind, id) {
    if (QUEUE[kind]?.[id]) {
      delete QUEUE[kind][id];
    }

    if (!Object.keys(QUEUE[kind]).length) {
      delete QUEUE[kind];
    }

    if (promises && promises.length) {
      promises.forEach(promise => promise.resolve(result));
    }
  }
}

export function convertToShikiType(type) {
  switch (type) {
    case 'ranobe':
      return 'manga';

    case 'poster':
      return 'user_image';

    case 'image':
      return 'user_image';

    // case 'profile':
      // return 'user';

    case 'entry':
      return 'topic';

    default:
      return type;
  }
}
