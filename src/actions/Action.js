import forEach from 'lodash-es/forEach';
import has from 'lodash-es/has';
import map from 'lodash-es/map';
import merge from 'lodash-es/merge';
import flatten from 'lodash-es/flatten';
import Context from '../common/context';
import { ModuleConfig, ModelConfig } from '../support/interfaces';

export default class Action {
  /**
   * Transform Module to include ModuleConfig
   * @param {object} model
   */
  static transformModule(module) {
    return merge({}, ModuleConfig, module);
  }

  /**
   * Transform Model to include ModelConfig
   * @param {object} model
   */
  static transformModel(model) {
    const context = Context.getInstance();
    ModelConfig.http = merge({}, ModelConfig.http, context.options.http);
    model.methodConf = merge({}, ModelConfig, model.methodConf);
    model.methodConf.http.url = (model.methodConf.http.url === '/') ? `/${model.entity}` : model.methodConf.http.url;

    /**
     * Add Model Interface to each model
     */
    model.getFields = () => {
      if (!model.cachedFields) {
        model.cachedFields = merge({}, {
          $id: model.attr(undefined),
          $isUpdating: model.boolean(false),
          $updateErrors: model.attr([]),
          $isDeleting: model.boolean(false),
          $deleteErrors: model.attr([]),
        }, model.fields());
      }

      return model.cachedFields;
    };

    return model;
  }

  /**
   * Transform Params and Return Endpoint
   * @param {string} type
   * @param {object} model
   * @param {object} config
   */
  static transformParams(type, model, config = {}) {
    let endpoint = `${model.methodConf.http.url}${model.methodConf.methods[type].http.url}`;
    const params = map(endpoint.match(/(\/?)(\:)([A-z]*)/gm), param => param.replace('/', ''));

    forEach(params, (param) => {
      const paramValue = has(config.params, param.replace(':', '')) ? config.params[param.replace(':', '')] : '';
      endpoint = endpoint.replace(param, paramValue).replace('//', '/');
    });
    if (config.query) {
      // Map the keys, flatten and join
      endpoint += `?${flatten(Object.keys(config.query).map((k) => {
        const value = config.query[k];
        if (Array.isArray(value)) {
          return value.map(v => `${encodeURIComponent(k)}[]=${encodeURIComponent(v)}`);
        }
        return `${encodeURIComponent(k)}=${encodeURIComponent(config.query[k])}`;
      })).join('&')}`;
    }
    return endpoint;
  }

  /**
   * Get appropriate methods
   * @param {string} type
   * @param {object} model
   * @param {string} defaultMethod
   */
  static getMethod(type, model, defaultMethod) {
    const customMethod = model.methodConf.methods[type].http.method;
    return (customMethod) ? customMethod : defaultMethod;
  }
}
