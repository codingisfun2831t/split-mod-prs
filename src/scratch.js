/*

    scratch.js

    loading Scratch projects in Split!

    written by codingisfun2831t

    Copyright (C) 2026 by codingisfun2831t

    This file is part of Split!.

*/

// Global Stuff /////////////////////////////////////////////////////////////

modules.scratch = "2026-February-2";

/**
 * 
 * @param {JSZip} zip 
 */
async function loadScratchProject(zip, name) {
    let scene = new Scene();
    scene.name = name;

    let projectFile = zip.file("project.json");
    let projectJson = JSON.parse(await projectFile.async("string"));
    let targets = projectJson.targets;
    let stage = targets.find((target) => target.isStage);

    scene.stage.name = stage.name;
    scene.stage.setVolume(stage.volume);

    for (const cost of stage.costumes) {
        scene.stage.costumes.add(await loadCostume(cost));
    }

    for (const snd of stage.sounds) {
        scene.stage.sounds.add(await loadSound(snd));
    }

    scene.stage.wearCostume(scene.stage.costumes.at(stage.currentCostume + 1));

    let variableMap = new Map();
    for (const [id, val] of Object.entries(stage.variables)) {
        variableMap.set(id, val);

        scene.stage.addVariable(val[0], true);
        scene.stage.variables.setVar(val[0], val[1]);
    }

    let sprites = new Map();
    for (const target of targets) {
        if (target.isStage) continue;

        let sprite = new SpriteMorph(scene.globalVariables);
        let spriteVarMap = new Map();

        let obj = { sprite, spriteVarMap }
        sprite.name = target.name;
        sprites.set(sprite.name, obj);

        scene.sprites.add(sprite);
        scene.stage.add(sprite);

        sprite.gotoXY(target.x || 0, target.y || 0);
        sprite.setSize(target.size);
        sprite.setHeading(target.direction);
        sprite.isDraggable = target.draggable;

        switch (target.rotationStyle) {
            case "all around":
                sprite.rotationStyle = 1;
                break;
            case "left-right":
                sprite.rotationStyle = 2;
                break;
            case "don't rotate":
                sprite.rotationStyle = 0;
                break;
        }

        if (!target.visible) {
            sprite.hide();
        }

        sprite.setVolume(target.volume);

        for (const cost of target.costumes) {
            sprite.costumes.add(await loadCostume(cost));
        }

        for (const snd of target.sounds) {
            sprite.sounds.add(await loadSound(snd));
        }
        
        for (const [id, val] of Object.entries(target.variables)) {
            spriteVarMap.set(id, val);

            sprite.addVariable(val[0], false);
            sprite.variables.setVar(val[0], val[1]);
        }

        sprite.wearCostume(sprite.costumes.at(target.currentCostume + 1));
    };

    if (scene.sprites.length() === 0) {
        scene.currentSprite = scene.stage;
    } else {
        scene.currentSprite = scene.sprites.at(1);
    }

    let project = new Project();
    project.scenes.add(scene);
    project.currentScene = scene;

    return project;

    async function loadCostume(cost) {
        const file = zip.file(cost.md5ext);

        if (cost.dataFormat === "svg") {
            const svgText = await file.async("string");
            const blob = new Blob([svgText], { type: "image/svg+xml" });
            const url = URL.createObjectURL(blob);

            const img = new Image();
            img.src = url;
            await img.decode();

            URL.revokeObjectURL(url);

            return new SVG_Costume(
                img,
                cost.name,
                new Point(cost.rotationCenterX, cost.rotationCenterY)
            );
        } else {
            const blob = await file.async("blob");
            const url = URL.createObjectURL(blob);

            const img = new Image();
            img.src = url;
            await img.decode();

            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext("2d").drawImage(img, 0, 0);

            URL.revokeObjectURL(url);

            return new Costume(
                canvas,
                cost.name,
                new Point(cost.rotationCenterX, cost.rotationCenterY)
            );
        }
    }

    async function loadSound(snd) {
        const file = zip.file(snd.md5ext);
        const blob = await file.async("blob");
        const url = URL.createObjectURL(blob);

        const audio = new Audio();
        audio.src = url;

        await new Promise((resolve, reject) => {
            audio.onloadeddata = resolve;
            audio.onerror = reject;
        });

        URL.revokeObjectURL(url);

        return new Sound(
            audio,
            snd.name
        );
    }
}