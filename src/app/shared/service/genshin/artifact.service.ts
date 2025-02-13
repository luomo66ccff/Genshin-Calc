import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { keysEqual } from 'src/app/shared/class/util';
import { artifactSet, Const, ExtraArtifactSetData, ExtraDataService, ExtraStatus, GenshinDataService, StorageService } from 'src/app/shared/shared.module';

export interface ArtifactStorageItemData {
  name?: string;
  value?: number;
}

export interface ArtifactStoragePartData {
  [key: string]: ArtifactStorageItemData;
}

export interface ArtifactStorageInfo {
  isAuto?: boolean;
  setIndexs?: string[];
  setFullIndex?: string;
  extra?: ExtraArtifactSetData;
  flower?: ArtifactStoragePartData;
  plume?: ArtifactStoragePartData;
  sands?: ArtifactStoragePartData;
  goblet?: ArtifactStoragePartData;
  circlet?: ArtifactStoragePartData;
  autoDamageRate?: number;
  autoDamageBase?: string;
  autoDamageRateAttach?: number;
  autoDamageBaseAttach?: string;
  autoElementType?: string;
  autoAttackType?: string;
  autoDamageType?: string;
  autoDamageTag?: string;
  autoEffectNum?: number;
  autoPropCurve?: string;
  autoPropCurrentPoint?: number;
  autoMaxCritRate?: number;
  autoNeedUpdate?: boolean;
  autoUseDPS?: boolean;
  autoUsedDPSIndex?: number;
}

export interface ArtifactStorageData {
  activeIndex: number;
  info: ArtifactStorageInfo[];
}

export interface ChipData {
  onlyForAll?: boolean;
  onlyForOne?: boolean;

  rules: chipRule[][]; //([]||[])&&([]||[])

  content: string;
  needValue?: boolean;
  value?: any;

  icon?: string;
  iconSize?: number;

  imgUrl?: string;
  imgWidth?: number;
  imgHeight?: number;
  imgRightEm?: number;

  svg?: boolean;
  svgPaths?: chipSvgPath[];

  tip?: string;
  colorPropName?: string;
  colorDivides?: number[];
  colors?: string[];
  disable?: boolean;
}

export interface chipRule {
  propName?: string;
  expectGEValue?: number;
  expectLEValue?: number;
}

export interface chipSvgPath {
  style?: string;
  d?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ArtifactService {

  //データマップ
  dataMap!: Record<string, ArtifactStorageData>;
  private changedSubject: Subject<void> = new Subject<void>();
  private changedSubject$: Observable<void> = this.changedSubject.asObservable();

  constructor(private genshinDataService: GenshinDataService, private storageService: StorageService, private extraDataService: ExtraDataService) {
    let temp = this.storageService.getJSONItem(Const.SAVE_ARTIFACT)
    if(temp){
      this.dataMap = temp;
    }else{
      this.dataMap = {};
    }
  }

  changed() {
    return this.changedSubject$;
  }

  next() {
    this.changedSubject.next();
  }

  //クリア
  clearStorageInfo(index: string | number){
    let indexStr = index.toString();
    delete this.dataMap[indexStr];
  }

  //聖遺物全ロールバック
  recoverAllData(index: string | number) {
    let indexStr = index.toString();
    let temp = this.storageService.getJSONItem(Const.SAVE_ARTIFACT)
    if(temp){
      let storageInfo: ArtifactStorageData = temp[indexStr];
      this.dataMap[indexStr].info = storageInfo.info;
    }
  }

  //聖遺物ロールバック
  recoverData(index: string | number, artIndex: number) {
    let indexStr = index.toString();
    let temp = this.storageService.getJSONItem(Const.SAVE_ARTIFACT)
    if(temp){
      let storageInfo: ArtifactStorageData = temp[indexStr];
      if(this.dataMap[indexStr].info.length == storageInfo.info.length && artIndex < storageInfo.info.length){
        this.dataMap[indexStr].info[artIndex] = JSON.parse(JSON.stringify(storageInfo.info[artIndex]));
      }
    }
  }

  getSetMap(): Record<string, artifactSet> {
    return GenshinDataService.dataReliquarySet;
  }

  getSetData(index: string | number){
    let indexStr = index.toString();
    return GenshinDataService.dataReliquarySet[indexStr];
  }

  getSet(index: string | number): artifactSet {
    return this.genshinDataService.getReliquarySet(index.toString());
  }

  get(index: string | number): artifactSet {
    return this.getSet(index);
  }

  //適用中インデックス取得
  getStorageActiveIndex(charIndex: string | number){
    let keyStr = charIndex.toString();
    this.initDefaultData(keyStr);
    return this.dataMap[keyStr].activeIndex;
  }

  //適用中インデックスAutoフラグ取得
  getStorageActiveIndexAutoFlag(charIndex: string | number){
    let keyStr = charIndex.toString();
    this.initDefaultData(keyStr);
    return this.dataMap[keyStr]?.info[this.getStorageActiveIndex(keyStr)]?.isAuto ?? false;
  }

  //適用中インデックス設定
  setStorageActiveIndex(charIndex: string | number, index: number): number{
    let keyStr = charIndex.toString();
    this.initDefaultData(keyStr);
    let lastKeyIndex = this.dataMap[keyStr].activeIndex;
    this.dataMap[keyStr].activeIndex = index;
    return lastKeyIndex;
  }

  //設定長さ取得
  getStorageInfoLength(charIndex: string | number){
    let keyStr = charIndex.toString();
    this.initDefaultData(keyStr);
    return this.dataMap[keyStr].info.length;
  }

  //聖遺物セット削除
  deleteStorageInfo(charIndex: string | number, index: number){
    let keyStr = charIndex.toString();
    this.initDefaultData(keyStr);
    this.dataMap[keyStr].info.splice(index, 1);
  }

  //聖遺物プッシュ
  pushStorageInfo(charIndex: string | number, info: ArtifactStorageInfo): number{
    let keyStr = charIndex.toString();
    this.initDefaultData(keyStr);
    this.checkAndSetInfoData(info);
    this.dataMap[keyStr].info.push(info);
    return this.setStorageActiveIndex(keyStr, this.dataMap[keyStr].info.length - 1);
  }

  //聖遺物セット設定
  setStorageSetIndexsAll(charIndex: string | number, setIndexs: string[], index?: number, lastIndex?: number){
    let keyStr = charIndex.toString();
    let infoIndex = this.dataMap[keyStr].activeIndex;
    if(index != undefined){
      infoIndex = index;
    }
    this.initDefaultData(keyStr);
    let info = this.dataMap[keyStr].info[infoIndex];
    info.setIndexs = setIndexs;
    if(setIndexs[0] == setIndexs[1] && setIndexs[0] != "" && setIndexs[0]){
      info.setFullIndex = setIndexs[0];
    }else{
      info.setFullIndex = '';
    }
    //同じセットの場合、同じ設定にする（初期化なし）
    if(lastIndex !== undefined && lastIndex > -1 && lastIndex < this.dataMap[keyStr].info.length){
      let lastInfo = this.dataMap[keyStr].info[lastIndex];
      if(lastInfo.setFullIndex == info.setFullIndex){
        info.extra = {...lastInfo.extra}
        return
      }
    }
    this.setDefaultExtraData(keyStr, info.setIndexs, info.setFullIndex);
  }

  //聖遺物情報コピー
  copyAndCreateStorageInfo(charIndex: string | number, sourceIndex: number){
    let keyStr = charIndex.toString();
    this.initDefaultData(keyStr);
    this.dataMap[keyStr].info.push(JSON.parse(JSON.stringify(this.dataMap[keyStr].info[sourceIndex])));
  }

  //ストレージ適用中聖遺物データ取得
  getStorageActiveArtifactInfo(charIndex: string){
    let keyStr = charIndex.toString();
    this.initDefaultData(keyStr);
    return this.dataMap[keyStr].info[this.dataMap[keyStr].activeIndex];
  }

  //聖遺物セット情報取得
  getStorageSetIndexs(charIndex: string | number, index?: number){
    let keyStr = charIndex.toString();
    if(index == undefined){
      index = this.dataMap[charIndex].activeIndex;
    }
    this.initDefaultData(keyStr);
    if(!(index in this.dataMap[keyStr].info)){
      this.dataMap[keyStr].info[index] = {};
    }
    if(this.dataMap[keyStr].info[index].setIndexs == undefined || this.dataMap[keyStr].info[index].setIndexs?.length != 2){
      this.dataMap[keyStr].info[index].setIndexs = ['', ''];
    }
    return this.dataMap[keyStr].info[index].setIndexs!;
  }

  setStorageFullSetIndex(charIndex: string | number, index?: number, value?: string, isInit?: boolean){
    let keyStr = charIndex.toString();
    if(index == undefined){
      index = this.dataMap[charIndex].activeIndex;
    }
    this.initDefaultData(keyStr);
    if(!(index in this.dataMap[keyStr].info)){
      this.dataMap[keyStr].info[index] = {};
    }
    this.dataMap[keyStr].info[index].setFullIndex = value;
    if(value == '' && !isInit){
      this.clearExtraData(keyStr);
    }
  }

  //聖遺物セットフル情報取得
  getStorageFullSetIndex(charIndex: string | number, index?: number){
    let keyStr = charIndex.toString();
    if(index == undefined){
      index = this.dataMap[charIndex].activeIndex;
    }
    this.initDefaultData(keyStr);
    if(!(index in this.dataMap[keyStr].info)){
      this.dataMap[keyStr].info[index] = {};
    }
    if(this.dataMap[keyStr].info[index].setFullIndex == undefined){
      this.dataMap[keyStr].info[index].setFullIndex = '';
    }
    return this.dataMap[keyStr].info[index].setFullIndex!;
  }

  //設定取得
  getStorageInfo(charIndex: string | number, index: number, part: string){
    let keyStr = charIndex.toString();
    this.initDefaultData(keyStr);
    if(!(index in this.dataMap[keyStr].info)){
      this.dataMap[keyStr].info[index] = {};
    }
    if(this.dataMap[keyStr].info[index][part as keyof ArtifactStorageInfo] == undefined){
      this.checkAndSetInfoData(this.dataMap[keyStr].info[index]);
    }
    return this.dataMap[keyStr].info[index][part as keyof ArtifactStorageInfo] as ArtifactStoragePartData;
  }

  //全設定取得
  getAllStorageInfo(charIndex: string | number, index: number){
    let keyStr = charIndex.toString();
    this.initDefaultData(keyStr);
    if(!(index in this.dataMap[keyStr].info)){
      this.dataMap[keyStr].info[index] = {};
    }
    if(this.dataMap[keyStr].info[index] == undefined){
      this.checkAndSetInfoData(this.dataMap[keyStr].info[index]);
    }
    return this.dataMap[keyStr].info[index];
  }

  //ストレージに保存
  saveData(){
    this.storageService.setJSONItem(Const.SAVE_ARTIFACT, this.dataMap);
  }

  //デフォールト追加データ設定
  setDefaultExtraData(charIndex: string | number, index: string[], fullIndex: string){
    let charKeyStr = charIndex.toString();
    this.initDefaultData(charKeyStr);
    this.dataMap[charKeyStr].info[this.dataMap[charKeyStr].activeIndex].extra = 
    {...this.dataMap[charKeyStr].info[this.dataMap[charKeyStr].activeIndex].extra, ...this.extraDataService.getArtifactSetDefaultSetting(index, fullIndex)};
  }
  
  //追加データクリア
  clearExtraData(index: string | number){
    let temp = this.getExtraData(index);
    delete temp?.set1;
    delete temp?.set2;
  }

  //追加データ取得
  getExtraData(index: string | number){
    let charKeyStr = index.toString();
    if(charKeyStr in this.dataMap && this.dataMap[charKeyStr]){
      return this.dataMap[charKeyStr].info[this.dataMap[charKeyStr].activeIndex].extra;
    }
    return undefined;
  }

  setExtraSwitch(index: string | number, skill: string, buffIndex: number, enable: boolean, skillIndex?: number | string){
    let skillStatus = this.getExtraSkillData(index, skill, skillIndex);
    if(skillStatus['switchOnSet'] == undefined){
      skillStatus['switchOnSet'] = {};
    }
    skillStatus['switchOnSet'][buffIndex.toString()] = enable;
  }

  setExtraSlider(index: string | number, skill: string, buffIndex: number, setValue: number, skillIndex?: number | string){
    let skillStatus = this.getExtraSkillData(index, skill, skillIndex);
    if(skillStatus['sliderNumMap'] == undefined){
      skillStatus['sliderNumMap'] = {};
    }
    skillStatus['sliderNumMap'][buffIndex.toString()] = setValue;
  }

  getExtraSwitch(index: string | number, skill: string, buffIndex: number, skillIndex?: number | string){
    let skillStatus = this.getExtraSkillData(index, skill, skillIndex);
    if(skillStatus['switchOnSet'] != undefined){
      return skillStatus['switchOnSet'][buffIndex.toString()];
    }
    return false;
  }

  getExtraSlider(index: string | number, skill: string, buffIndex: number, skillIndex?: number | string){
    let skillStatus = this.getExtraSkillData(index, skill, skillIndex);
    if(skillStatus['sliderNumMap'] != undefined){
      return skillStatus['sliderNumMap'][buffIndex.toString()];
    }
    return 0;
  }

  checkAndFixExtraData(charIndex: string | number, selectedIndex: number){
    const charKeyStr = charIndex.toString();
    if(selectedIndex < 0 || selectedIndex >= this.dataMap[charKeyStr].info.length){
      return
    }
    const indexs = this.dataMap[charKeyStr].info[selectedIndex].setIndexs;
    const fullIndex = this.dataMap[charKeyStr].info[selectedIndex].setFullIndex;
    if(!Array.isArray(indexs) || indexs.length !== 2) {
      this.dataMap[charKeyStr].info[selectedIndex].setIndexs = ['', '']
      return
    }
    if(!fullIndex){
      return
    }
    if(!indexs.every((v: string) => v === fullIndex)){
      this.dataMap[charKeyStr].info[selectedIndex].extra = {};
      this.dataMap[charKeyStr].info[selectedIndex].setFullIndex = "";
      return
    }
    const target = this.extraDataService.getArtifactSetDefaultSetting(indexs, fullIndex);
    const handler = {
      set: function(obj: any, prop: string, value: any) {
        obj[prop] = value;
        return true;
      },
      get: function(obj: any, prop: string) {
        return obj[prop];
      }
    }
    const extraInfoProxy = new Proxy(this.dataMap[charKeyStr].info[selectedIndex], handler);
    if(Object.keys(extraInfoProxy.extra ?? {}).length === 0){
      extraInfoProxy.extra = target;
    }else{
      let origin = extraInfoProxy.extra;
      if(!keysEqual(origin?.set1, target?.set1)
      ||!keysEqual(origin?.set2, target?.set2)){
        extraInfoProxy.extra = target;
      }
    }
  }

  private getExtraSkillData(index: string | number, skill: string, skillIndex?: number | string){
    let keyStr = index.toString();
    let skillStatus!: ExtraStatus;
    let extraData = this.dataMap[keyStr].info[this.dataMap[keyStr].activeIndex].extra;
    switch(skill){
      case Const.NAME_SET:
        skillStatus = extraData![Const.NAME_SET + skillIndex!.toString() as keyof ExtraArtifactSetData]!;
        break;
    }
    return skillStatus!;
  }

  private initDefaultData(keyStr: string){
    if(this.dataMap[keyStr] == undefined){
      this.dataMap[keyStr] = {
        activeIndex: 0,
        info: [],
      };
    }
  }

  private checkAndSetInfoData(info: ArtifactStorageInfo){
    if(info.setIndexs == undefined){
      info.setIndexs = ['', ''];
    }
    if(info.setFullIndex == undefined){
      info.setFullIndex = '';
    }
    for(let key of ["flower", "plume", "sands", "goblet", "circlet"] as (keyof ArtifactStorageInfo)[]){
      if(info[key] == undefined){
        let temp = {
          "main":{},
          "sub1":{},
          "sub2":{},
          "sub3":{},
          "sub4":{},
        };
        switch(key){
          case "flower":
            info.flower = temp;
            break;
          case "plume":
            info.plume = temp;
            break;
          case "sands":
            info.sands = temp;
            break;
          case "goblet":
            info.goblet = temp;
            break;
          case "circlet":
            info.circlet = temp;
            break;
        }
      }
    }
  }
}
