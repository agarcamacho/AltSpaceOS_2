"use strict";
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Colaider = void 0;
const MRE = __importStar(require("@microsoft/mixed-reality-extension-sdk"));
/**
 * The main class of this app. All the logic goes here.
 */
class Colaider {
    constructor(context) {
        this.context = context;
        this.text = null;
        this.cube = null;
        this.context.onStarted(() => this.started());
    }
    /**
     * Once the context is "started", initialize the app.
     */
    async started() {
        // set up somewhere to store loaded assets (meshes, textures, animations, gltfs, etc.)
        this.assets = new MRE.AssetContainer(this.context);
        // Create a new actor with no mesh, but some text.
        this.text = MRE.Actor.Create(this.context, {
            actor: {
                name: 'Text',
                transform: {
                    app: { position: { x: 0, y: 1, z: 0 } }
                },
                text: {
                    contents: "¡Enhorabuena! Acércate al podio a recoger tu trofeo.",
                    anchor: MRE.TextAnchorLocation.MiddleCenter,
                    color: { r: 30 / 255, g: 206 / 255, b: 213 / 255 },
                    height: 0.5
                }
            }
        });
        // Here we create an animation for our text actor. First we create animation data, which can be used on any
        // actor. We'll reference that actor with the placeholder "text".
        const spinAnimData = this.assets.createAnimationData(
        // The name is a unique identifier for this data. You can use it to find the data in the asset container,
        // but it's merely descriptive in this sample.
        "Spin", {
            // Animation data is defined by a list of animation "tracks": a particular property you want to change,
            // and the values you want to change it to.
            tracks: [{
                    // This animation targets the rotation of an actor named "text"
                    target: MRE.ActorPath("text").transform.local.rotation,
                    // And the rotation will be set to spin over 20 seconds
                    keyframes: this.generateSpinKeyframes(20, MRE.Vector3.Up()),
                    // And it will move smoothly from one frame to the next
                    easing: MRE.AnimationEaseCurves.Linear
                }]
        });
        // Once the animation data is created, we can create a real animation from it.
        spinAnimData.bind(
        // We assign our text actor to the actor placeholder "text"
        { text: this.text }, 
        // And set it to play immediately, and bounce back and forth from start to end
        { isPlaying: true, wrapMode: MRE.AnimationWrapMode.PingPong });
        // Load a glTF model before we use it
        const cubeData = await this.assets.loadGltf('banana.glb', "box");
        // spawn a copy of the glTF model
        this.cube = MRE.Actor.CreateFromPrefab(this.context, {
            // using the data we loaded earlier
            firstPrefabFrom: cubeData,
            // Also apply the following generic actor properties.
            actor: {
                name: 'Altspace Cube',
                // Parent the glTF model to the text actor, so the transform is relative to the text
                parentId: this.text.id,
                transform: {
                    local: {
                        position: { x: 0, y: -10, z: 0 },
                        scale: { x: 0.05, y: 0.05, z: 0.05 }
                    }
                },
            }
        });
        this.triggerVolume = MRE.Actor.CreatePrimitive(this.assets, {
            definition: { shape: MRE.PrimitiveShape.Box },
            actor: {
                transform: {
                    local: {
                        scale: { x: 0.5, y: 1, z: 1.75 }
                    }
                },
                appearance: { enabled: true }
            },
            addCollider: true /* Must have a collider for triggers. */
        });
        this.triggerVolume.collider.isTrigger = true;
        this.triggerVolume.collider.onTrigger('trigger-enter', (actor) => this.text.text.contents = 'Ha colisionado');
        this.apple = MRE.Actor.CreateFromLibrary(this.context, {
            resourceId: 'artifact:1703285890605907986',
            actor: {
                transform: {
                    local: {
                        position: { x: -3, y: 0, z: 0 },
                        scale: { x: 5, y: 5, z: 5 },
                    }
                },
                grabbable: true,
                //==============================
                // Note: UNDOCUMENTED BEHAVIOR
                // The Actor must have a rigidBody to cause the trigger.
                //
                // It must also have a collider, and adding a rigidBody in the MRE
                // call seems to disable the collider provided by the kit object.
                //
                // Define both in the call.
                //==============================
                rigidBody: {
                    useGravity: true // Don't let the actor fall when released.
                },
                collider: {
                    geometry: {
                        shape: MRE.ColliderType.Box,
                        size: { x: 0.1, y: 0.1, z: 0.1 }
                    }
                },
                //==============================
                // Need to subscribe to transforms for triggers
                // to work for all users interactions.
                //==============================
                subscriptions: ['transform']
            }
        });
        // Create some animations on the cube.
        const flipAnimData = this.assets.createAnimationData(
        // the animation name
        "DoAFlip", { tracks: [{
                    // applies to the rotation of an unknown actor we'll refer to as "target"
                    target: MRE.ActorPath("target").transform.local.rotation,
                    // do a spin around the X axis over the course of one second
                    keyframes: this.generateSpinKeyframes(1.0, MRE.Vector3.Right()),
                    // and do it smoothly
                    easing: MRE.AnimationEaseCurves.Linear
                }] });
        // apply the animation to our cube
        const flipAnim = await flipAnimData.bind({ target: this.cube });
        // Set up cursor interaction. We add the input behavior ButtonBehavior to the cube.
        // Button behaviors have two pairs of events: hover start/stop, and click start/stop.
        const buttonBehavior = this.cube.setBehavior(MRE.ButtonBehavior);
        // Trigger the grow/shrink animations on hover.
        buttonBehavior.onHover('enter', () => {
            // use the convenience function "AnimateTo" instead of creating the animation data in advance
            MRE.Animation.AnimateTo(this.context, this.cube, {
                destination: { transform: { local: { scale: { x: 0.5, y: 0.5, z: 0.5 } } } },
                duration: 0.3,
                easing: MRE.AnimationEaseCurves.EaseOutSine
            });
        });
        buttonBehavior.onHover('exit', () => {
            MRE.Animation.AnimateTo(this.context, this.cube, {
                destination: { transform: { local: { scale: { x: 0.4, y: 0.4, z: 0.4 } } } },
                duration: 0.3,
                easing: MRE.AnimationEaseCurves.EaseOutSine
            });
        });
        // When clicked, do a 360 sideways.
        buttonBehavior.onClick(_ => {
            flipAnim.play();
        });
    }
    /**
     * Generate keyframe data for a simple spin animation.
     * @param duration The length of time in seconds it takes to complete a full revolution.
     * @param axis The axis of rotation in local space.
     */
    generateSpinKeyframes(duration, axis) {
        return [{
                time: 0 * duration,
                value: MRE.Quaternion.RotationAxis(axis, 0)
            }, {
                time: 0.25 * duration,
                value: MRE.Quaternion.RotationAxis(axis, Math.PI / 2)
            }, {
                time: 0.5 * duration,
                value: MRE.Quaternion.RotationAxis(axis, Math.PI)
            }, {
                time: 0.75 * duration,
                value: MRE.Quaternion.RotationAxis(axis, 3 * Math.PI / 2)
            }, {
                time: 1 * duration,
                value: MRE.Quaternion.RotationAxis(axis, 2 * Math.PI)
            }];
    }
}
exports.Colaider = Colaider;
//# sourceMappingURL=pruebasColaider.js.map