/* Copyright (c) 2021 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "brave/components/child_process_monitor/child_process_monitor.h"

#if BUILDFLAG(IS_WIN)
#include <windows.h>
#elif BUILDFLAG(IS_POSIX)
#include <signal.h>
#endif

#include <utility>

#include "base/functional/bind.h"
#include "base/functional/callback.h"
#include "base/memory/scoped_refptr.h"
#include "base/process/process.h"
#include "base/process/process_handle.h"
#include "base/task/sequenced_task_runner.h"
#include "base/test/multiprocess_test.h"
#include "base/test/task_environment.h"
#include "base/test/test_future.h"
#include "base/test/test_timeouts.h"
#include "base/threading/platform_thread.h"
#include "base/time/time.h"
#include "build/build_config.h"
#include "testing/gtest/include/gtest/gtest.h"
#include "testing/multiprocess_func_list.h"

namespace brave {
namespace {
void ExpectSequenceAndForward(
    scoped_refptr<base::SequencedTaskRunner> expected_runner,
    base::OnceCallback<void(base::ProcessId)> callback,
    base::ProcessId pid) {
  EXPECT_TRUE(expected_runner->RunsTasksInCurrentSequence());
  std::move(callback).Run(pid);
}
}  // namespace

class ChildProcessMonitorTest : public base::MultiProcessTest {
 protected:
  void StartMonitor(ChildProcessMonitor& monitor, const base::Process& child) {
    monitor.Start(child.Duplicate(),
                  base::BindOnce(&ExpectSequenceAndForward,
                                 base::SequencedTaskRunner::GetCurrentDefault(),
                                 exit_future_.GetSequenceBoundCallback()));
  }

  void ExpectExit(const base::Process& child) {
    EXPECT_EQ(exit_future_.Get(), child.Pid());
    // On POSIX the monitor reaps the child. Checking before its callback can
    // consume the exit status that the monitor is waiting for.
    EXPECT_TRUE(child.WaitForExitWithTimeout(base::TimeDelta(), nullptr));
  }

 private:
  base::test::TaskEnvironment task_environment_;
  base::test::TestFuture<base::ProcessId> exit_future_;
};

MULTIPROCESS_TEST_MAIN(NeverDieChildProcess) {
  while (true) {
    base::PlatformThread::Sleep(TestTimeouts::action_max_timeout());
  }
}

TEST_F(ChildProcessMonitorTest, Terminate) {
  ChildProcessMonitor monitor;

  base::Process process = SpawnChild("NeverDieChildProcess");
  ASSERT_TRUE(process.IsValid());
  StartMonitor(monitor, process);
  ASSERT_TRUE(process.Terminate(0, false));
  ExpectExit(process);
}

TEST_F(ChildProcessMonitorTest, Kill) {
  ChildProcessMonitor monitor;

  base::Process process = SpawnChild("NeverDieChildProcess");
  ASSERT_TRUE(process.IsValid());
  StartMonitor(monitor, process);
#if BUILDFLAG(IS_WIN)
  ASSERT_TRUE(::TerminateProcess(process.Handle(), 1));
#elif BUILDFLAG(IS_POSIX)
  ASSERT_EQ(0, ::kill(process.Pid(), SIGKILL));
#endif
  ExpectExit(process);
}

MULTIPROCESS_TEST_MAIN(FastSleepyChildProcess) {
  base::PlatformThread::Sleep(TestTimeouts::tiny_timeout() * 10);
  return 0;
}

TEST_F(ChildProcessMonitorTest, ChildExit) {
  ChildProcessMonitor monitor;

  base::Process process = SpawnChild("FastSleepyChildProcess");
  ASSERT_TRUE(process.IsValid());

  // Set up monitor before the child process has a chance to exit
  StartMonitor(monitor, process);
  ExpectExit(process);
}

MULTIPROCESS_TEST_MAIN(SleepyCrashChildProcess) {
  base::PlatformThread::Sleep(TestTimeouts::tiny_timeout() * 10);
#if BUILDFLAG(IS_POSIX)
  // Have to disable to signal handler for segv so we can get a crash
  // instead of an abnormal termination through the crash dump handler.
  ::signal(SIGSEGV, SIG_DFL);
#endif
  // Make this process have a segmentation fault.
  volatile int* oops = nullptr;
  *oops = 0xDEAD;
  return 1;
}

TEST_F(ChildProcessMonitorTest, ChildCrash) {
  ChildProcessMonitor monitor;

  base::Process process = SpawnChild("SleepyCrashChildProcess");
  ASSERT_TRUE(process.IsValid());

  // Set up monitor immediately after spawning to avoid race condition
  StartMonitor(monitor, process);
  ExpectExit(process);
}

}  // namespace brave
