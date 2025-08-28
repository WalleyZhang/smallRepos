import {
  Group,
  LoadingManager,
  ArrowHelper,
  Vector3
} from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'

interface RobotManifest {
  schema: string[];
  geometry: [number, number, number, number, number, number][];
}

type Pose = [number, number, number, number, number, number];

export class RobotLoader extends Group {
  private loadingManager!: LoadingManager;
  private manifest: RobotManifest | undefined;
  private robotPath = './GBT-C12A/';
  private _progressPercentage = 0;
  private _status: 'pending' | 'loading' | 'loaded' | 'failed' = 'pending';
  private _failReason: string | undefined;

  constructor() {
    super();
  }

  public get progressPercentage() {
    return this._progressPercentage;
  }

  public get status() {
    return this._status;
  }

  public get failReason() {
    return this._failReason;
  }

  /** 机器人初始化，尝试将机器人模型加载到内存中 */
  public async load() {
    this._status = 'loading';
    this._progressPercentage = 0;
    this._failReason = undefined;
    try {
      this.manifest = await this.loadRobotManifest();
      const joints = await this.loadJoints(this.manifest.schema, true);

      // 模型组装
      for (let i = 1; i < joints.length; i++) {
        joints[i - 1].add(joints[i]);
      }

      this.add(joints[0]);
      this._status = 'loaded';
    } catch (error: any) {
      this._status = 'failed';
      this._failReason = error?.message || '加载模型失败';
      throw new Error(this._failReason);
    }
  }

  /** 单独加载关节 */
  public async loadIndividualJoints(jointIndices: number[]) {
    this._status = 'loading';
    this._progressPercentage = 0;
    this._failReason = undefined;
    try {
      if (!this.manifest) {
        this.manifest = await this.loadRobotManifest();
      }

      const selectedSchemas = jointIndices.map(index => this.manifest!.schema[index]);
      const joints = await this.loadJoints(selectedSchemas, false);

      // 清空旧模型，添加新模型
      this.clear();
      joints.forEach((joint, index) => {
        // 分开放置，避免重叠
        joint.position.set(index * 100, 0, 0);
        this.add(joint);
      });

      this._status = 'loaded';
    } catch (error: any) {
      this._status = 'failed';
      this._failReason = error?.message || '加载模型失败';
      throw new Error(this._failReason);
    }
  }

  /** 加载机器人模型(返回独立的模型，需要自行组装) */
  private async loadJoints(schemas: string[], assemble: boolean): Promise<Group[]> {
    if (this.manifest === undefined) {
      throw Error('manifest 为空');
    }

    const promiseList: Promise<Group>[] = [];
    this.loadingManager = new LoadingManager();
    this.loadingManager.onProgress = (item, loaded, total) => {
      this._progressPercentage = parseFloat(((loaded / total) * 100).toFixed(2));
    };

    let pose: Pose = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < schemas.length; i++) {
      const jointIndex = this.manifest.schema.indexOf(schemas[i]);
      promiseList.push(this.createJointModel(schemas[i], assemble ? pose : [0, 0, 0, 0, 0, 0], jointIndex));
      if (assemble) {
        pose = this.manifest.geometry[jointIndex] as Pose;
      }
    }

    const jointModels = await Promise.all(promiseList);
    return jointModels;
  }

  /** 加载单个机器人关节模型并设置其初始位姿 */
  private async createJointModel(fileName: string, pose: Pose, jointNumber: number): Promise<Group> {
    const mtlLoader = new MTLLoader(this.loadingManager);
    const objLoader = new OBJLoader(this.loadingManager);
    mtlLoader.setPath(this.robotPath);
    objLoader.setPath(this.robotPath);

    // 添加唯一参数，避免缓存
    const cacheBuster = `?t=${Date.now()}`;
    const mtl = await mtlLoader.loadAsync(`${fileName}.mtl${cacheBuster}`);
    objLoader.setMaterials(mtl);
    const obj = await objLoader.loadAsync(`${fileName}.obj${cacheBuster}`);
    obj.position.set(pose[0], pose[1], pose[2]);
    // 基座要沿世界坐标系旋转，运动轴要沿自身坐标系旋转
    obj.rotation.set(pose[3], pose[4], pose[5], jointNumber === 0 ? 'ZYX' : 'XYZ');

    // 如果是第6个关节，则添加坐标系箭头用于可视化方向
    if (jointNumber === 6) {
      obj.add(new ArrowHelper(new Vector3(0, 0, 1), new Vector3(0, 0, 0), 50, 0x0000ff)); // 蓝色箭头表示 Z 轴
      obj.add(new ArrowHelper(new Vector3(0, 1, 0), new Vector3(0, 0, 0), 50, 0x00ff00)); // 绿色箭头表示 Y 轴
      obj.add(new ArrowHelper(new Vector3(1, 0, 0), new Vector3(0, 0, 0), 50, 0xff0000)); // 红色箭头表示 X 轴
    }

    return obj;
  }

  /** 加载 manifest 文件 */
  private async loadRobotManifest(): Promise<RobotManifest> {
    const response = await fetch(`${this.robotPath}/manifest.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.statusText}`);
    }
    return response.json();
  }
}