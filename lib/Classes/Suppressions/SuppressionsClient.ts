import urljoin from 'url-join';

/* eslint-disable camelcase */

import Request from '../common/Request';

import APIError from '../common/Error';
import NavigationThruPages from '../common/NavigationThruPages';
import Bounce from './Bounce';
import Complaint from './Complaint';
import Unsubscribe from './Unsubscribe';
import WhiteList from './WhiteList';
import Suppression from './Suppression';
import {
  IBounce,
  IComplaint,
  ISuppressionClient,
  IUnsubscribe,
  IWhiteList
} from '../../Interfaces/Suppressions';
import {
  SuppressionList,
  SuppressionListResponse,
  SuppressionDataType,
  SuppressionCreationData,
  SuppressionCreationResult,
  SuppressionCreationResponse,
  SuppressionListQuery,
  SuppressionResponse,
  SuppressionDestroyResult,
  SuppressionDestroyResponse
} from '../../Types/Suppressions';
import { APIErrorOptions } from '../../Types/Common';

const createOptions = {
  headers: { 'Content-Type': 'application/json' }
};

export default class SuppressionClient
  extends NavigationThruPages<SuppressionList>
  implements ISuppressionClient {
  request: Request;
  models: object;

  constructor(request: Request) {
    super(request);
    this.request = request;
    this.models = {
      bounces: Bounce,
      complaints: Complaint,
      unsubscribes: Unsubscribe,
      whitelists: WhiteList,
    };
  }

  protected parseList(
    response: SuppressionListResponse,
    Model: {
      new(data: SuppressionDataType):
      IBounce | IComplaint | IUnsubscribe | IWhiteList
    }
  ): SuppressionList {
    const data = {} as SuppressionList;
    data.items = response.body.items?.map((item) => new Model(item)) || [];

    data.pages = this.parsePageLinks(response, '?', 'address');
    data.status = response.status;
    return data;
  }

  _parseItem<T extends Suppression>(
    data : SuppressionDataType,
    Model: {
      new(dataType: SuppressionDataType):T
    }
  ): T {
    return new Model(data);
  }

  private createWhiteList(
    domain: string,
    data: SuppressionCreationData | SuppressionCreationData[],
    isDataArray: boolean
  ): Promise<SuppressionCreationResult> {
    if (isDataArray) {
      throw new APIError({
        status: 400,
        statusText: 'Data property should be an object',
        body: {
          message: 'Whitelist\'s creation process does not support multiple creations. Data property should be an object'
        }
      } as APIErrorOptions);
    }
    return this.request
      .postWithFD(urljoin('v3', domain, 'whitelists'), data)
      .then(this.prepareResponse);
  }

  private createUnsubscribe(
    domain: string,
    data: SuppressionCreationData | SuppressionCreationData[]
  ): Promise<SuppressionCreationResult> {
    if (Array.isArray(data)) { // User provided an array
      const isContainsTag = data.some((unsubscribe: SuppressionCreationData) => unsubscribe.tag);
      if (isContainsTag) {
        throw new APIError({
          status: 400,
          statusText: 'Tag property should not be used for creating multiple unsubscribes.',
          body: {
            message: 'Tag property can be used only if one unsubscribe provided as second argument of create method. Please use tags instead.'
          }
        } as APIErrorOptions);
      }
      return this.request
        .post(urljoin('v3', domain, 'unsubscribes'), JSON.stringify(data), createOptions)
        .then(this.prepareResponse);
    }

    if (data?.tags) {
      throw new APIError({
        status: 400,
        statusText: 'Tags property should not be used for creating one unsubscribe.',
        body: {
          message: 'Tags property can be used if you provides an array of unsubscribes as second argument of create method. Please use tag instead'
        }
      } as APIErrorOptions);
    }
    if (Array.isArray(data.tag)) {
      throw new APIError({
        status: 400,
        statusText: 'Tag property can not be an array',
        body: {
          message: 'Please use array of unsubscribes as second argument of create method to be able to provide few tags'
        }
      } as APIErrorOptions);
    }
    /* We need Form Data for unsubscribes if we want to support the "tag" property */
    return this.request
      .postWithFD(urljoin('v3', domain, 'unsubscribes'), data)
      .then(this.prepareResponse);
  }

  private getModel(type: string) {
    if (type in this.models) {
      return this.models[type as keyof typeof this.models];
    }
    throw new APIError({
      status: 400,
      statusText: 'Unknown type value',
      body: { message: 'Type may be only one of [bounces, complaints, unsubscribes, whitelists]' }
    } as APIErrorOptions);
  }

  private prepareResponse(response: SuppressionCreationResponse): SuppressionCreationResult {
    return {
      message: response.body.message,
      type: response.body.type || '',
      value: response.body.value || '',
      status: response.status
    };
  }

  async list(
    domain: string,
    type: string,
    query?: SuppressionListQuery
  ): Promise<SuppressionList> {
    const model = this.getModel(type);
    return this.requestListWithPages(urljoin('v3', domain, type), query, model);
  }

  get(
    domain: string,
    type: string,
    address: string
  ): Promise<IBounce | IComplaint | IUnsubscribe | IWhiteList> {
    const model = this.getModel(type);
    return this.request
      .get(urljoin('v3', domain, type, encodeURIComponent(address)))
      .then((response: SuppressionResponse) => this._parseItem<typeof model>(response.body, model));
  }

  create(
    domain: string,
    type: string,
    data: SuppressionCreationData | SuppressionCreationData[]
  ): Promise<SuppressionCreationResult> {
    this.getModel(type);
    // supports adding multiple suppressions by default
    let postData;
    const isDataArray = Array.isArray(data);

    if (type === 'whitelists') {
      return this.createWhiteList(domain, data, isDataArray);
    }

    if (type === 'unsubscribes') {
      return this.createUnsubscribe(domain, data);
    }

    if (!isDataArray) {
      postData = [data];
    } else {
      postData = [...data];
    }

    return this.request
      .post(urljoin('v3', domain, type), JSON.stringify(postData), createOptions)
      .then(this.prepareResponse);
  }

  destroy(
    domain: string,
    type: string,
    address: string
  ): Promise<SuppressionDestroyResult> {
    this.getModel(type);
    return this.request
      .delete(urljoin('v3', domain, type, encodeURIComponent(address)))
      .then((response: SuppressionDestroyResponse) => ({
        message: response.body.message,
        value: response.body.value || '',
        address: response.body.address || '',
        status: response.status
      }));
  }
}

module.exports = SuppressionClient;
