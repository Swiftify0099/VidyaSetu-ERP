const fs = require('fs');
const path = require('path');

// ── Patch 1: build.gradle.kts – Gradle 8.8+ serviceOf compatibility ─────────
const buildGradleKts = path.join(__dirname, '..', 'node_modules', '@react-native', 'gradle-plugin', 'build.gradle.kts');

if (fs.existsSync(buildGradleKts)) {
  let content = fs.readFileSync(buildGradleKts, 'utf8');
  let modified = false;

  if (content.includes('import org.gradle.configurationcache.extensions.serviceOf')) {
    content = content.replace('import org.gradle.configurationcache.extensions.serviceOf\n', '');
    content = content.replace('import org.gradle.configurationcache.extensions.serviceOf', '');
    modified = true;
  }

  if (content.includes('serviceOf<ModuleRegistry>()')) {
    content = content.replace(
      'serviceOf<ModuleRegistry>()',
      '(project.gradle as org.gradle.api.internal.GradleInternal).services.get(ModuleRegistry::class.java)'
    );
    modified = true;
  } else if (content.includes('(project as org.gradle.api.internal.GradleInternal)')) {
    content = content.replace(
      '(project as org.gradle.api.internal.GradleInternal)',
      '(project.gradle as org.gradle.api.internal.GradleInternal)'
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(buildGradleKts, content, 'utf8');
    console.log('[patch-gradle-plugin] Patched build.gradle.kts for Gradle 8.8+ compatibility.');
  }
}

// ── Patch 2: BundleHermesCTask.kt – Windows absolute paths for hermesc ───────
// Root cause: On Windows, windowsAwareCommandLine prepends "cmd /c", and
// hermesc receives relative paths via cliPath(). The cmd.exe subprocess writes
// the .hbc.map relative to its own CWD which may differ from project.exec's
// workingDir, causing NoSuchFileException when BundleHermesCTask tries to move
// the map file using its absolute File path.
const bundleHermesCTask = path.join(
  __dirname, '..', 'node_modules', '@react-native', 'gradle-plugin',
  'src', 'main', 'kotlin', 'com', 'facebook', 'react', 'tasks', 'BundleHermesCTask.kt'
);

if (fs.existsSync(bundleHermesCTask)) {
  let content = fs.readFileSync(bundleHermesCTask, 'utf8');

  const oldHermescCmd = `    return windowsAwareCommandLine(
        hermesCommand,
        "-emit-binary",
        "-max-diagnostic-width=80",
        "-out",
        bytecodeFile.cliPath(rootFile),
        bundleFile.cliPath(rootFile),
        *hermesFlags.get().toTypedArray())`;

  const newHermescCmd = `    // On Windows, cmd /c is prepended by windowsAwareCommandLine. When hermesc
    // receives a relative -out path, it writes the .hbc.map relative to its own
    // working dir (which cmd /c may not inherit correctly from project.exec).
    // Using absolutePath ensures hermesc writes the .hbc.map exactly where
    // BundleHermesCTask.run() expects it: File("\${bytecodeFile.absolutePath}.map").
    val outPath = if (Os.isWindows()) bytecodeFile.absolutePath else bytecodeFile.cliPath(rootFile)
    val inPath  = if (Os.isWindows()) bundleFile.absolutePath  else bundleFile.cliPath(rootFile)
    return windowsAwareCommandLine(
        hermesCommand,
        "-emit-binary",
        "-max-diagnostic-width=80",
        "-out",
        outPath,
        inPath,
        *hermesFlags.get().toTypedArray())`;

  if (!content.includes('val outPath = if (Os.isWindows())') && content.includes('bytecodeFile.cliPath(rootFile)')) {
    content = content.replace(oldHermescCmd, newHermescCmd);
    fs.writeFileSync(bundleHermesCTask, content, 'utf8');
    console.log('[patch-gradle-plugin] Patched BundleHermesCTask.kt for Windows absolute hermesc paths.');
  }
}

// ── Patch 3: FileUtils.kt – Windows atomic move / replace ────────────────────
// Root cause: On Windows, File.copyTo(destination, overwrite = true) calls
// destination.delete() which fails with FileAlreadyExistsException if the
// destination file has a temporary open lock from Metro/antivirus/indexing.
// Using java.nio.file.Files.move with REPLACE_EXISTING performs atomic overwrite.
const fileUtilsKt = path.join(
  __dirname, '..', 'node_modules', '@react-native', 'gradle-plugin',
  'src', 'main', 'kotlin', 'com', 'facebook', 'react', 'utils', 'FileUtils.kt'
);

if (fs.existsSync(fileUtilsKt)) {
  let content = fs.readFileSync(fileUtilsKt, 'utf8');

  const newFileUtilsContent = `/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.utils

import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption

internal fun File.moveTo(destination: File) {
  try {
    Files.move(toPath(), destination.toPath(), StandardCopyOption.REPLACE_EXISTING)
  } catch (e: Exception) {
    Thread.sleep(100)
    try {
      if (destination.exists()) {
        destination.delete()
      }
      Files.move(toPath(), destination.toPath(), StandardCopyOption.REPLACE_EXISTING)
    } catch (e2: Exception) {
      copyTo(destination, overwrite = true)
      delete()
    }
  }
}

internal fun File.recreateDir() {
  deleteRecursively()
  mkdirs()
}
`;

  if (!content.includes('StandardCopyOption.REPLACE_EXISTING')) {
    fs.writeFileSync(fileUtilsKt, newFileUtilsContent, 'utf8');
    console.log('[patch-gradle-plugin] Patched FileUtils.kt for atomic Windows file moves.');
  }
}

// Delete the pre-built JAR so Gradle rebuilds the plugin from patched source
const pluginJar = path.join(
  __dirname, '..', 'node_modules', '@react-native', 'gradle-plugin',
  'build', 'libs', 'react-native-gradle-plugin.jar'
);
if (fs.existsSync(pluginJar)) {
  fs.unlinkSync(pluginJar);
  console.log('[patch-gradle-plugin] Deleted pre-built plugin JAR to force recompile from patched source.');
}
