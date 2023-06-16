import {
  BounceData,
  ComplaintData,
  UnsubscribeData,
  WhiteListData
} from '.';
import {
  IBounce, IComplaint, IUnsubscribe, IWhiteList
} from '../../Interfaces';

import { PagesList, ParsedPagesList } from '../Common';

/* eslint-disable camelcase */

export type SuppressionList = {
  items: (IBounce | IComplaint | IUnsubscribe | IWhiteList)[];
  pages: ParsedPagesList;
  status: number;
}

export type SuppressionListQuery = {
  limit?: number;
  page?: string;
}

export type SuppressionDataType = BounceData | ComplaintData | UnsubscribeData | WhiteListData;

export type SuppressionListResponse = {
  body: {
    items: BounceData[] | ComplaintData[] | UnsubscribeData[] | WhiteListData[];
    paging: PagesList;
  }
  status: number;
}

export type SuppressionResponse = {
  body: SuppressionDataType;
  status: number;
}

export type SuppressionDestroyResponse = {
  body: {
    message: string;
    value?: string;
    address?: string;
  }
  status: number;
}

export type SuppressionDestroyResult = {
  message: string;
  value: string;
  address: string;
  status: number;
}

export type SuppressionCreationData = {
  address: string;
  code?: number;
  error?: string;
  domain?: string;
  tag?: string;
  created_at?: string ;
  /* Official documentation says that endpoint for "unsubscribes"  supports "tag" property
  but in reality it ignores the value of it.
  At the same time "tags" property seems working fine.
  https://github.com/mailgun/mailgun.js/issues/365
   */
  tags?: string[];
}

export type SuppressionCreationResponse = {
  body:{
    message:string;
    type?: string;
    value?: string;
  }
  status: number;
}

export type SuppressionCreationResult = {
  message:string;
  type: string;
  value: string;
  status: number;
}
