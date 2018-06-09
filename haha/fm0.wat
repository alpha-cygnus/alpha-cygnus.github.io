<Project $mode=project>
  <patches currentPatch=fmsynth0>
    <Synth id=testSynth title=TEST tx=0 ty=0 scale=1>
      <Gain id=gain0 x=150 y=0 gain=0 />
      <Gain id=gain1 x=0 y=100 gain=0 />
      <Osc id=osc0 x=-150 y=0 type=triangle />
      <ADSR id=adsr0 x=0 y=0 a=0.5 d=0.3 s=0.1 r=0.5 />
      <Const id=const0 x=-100 y=250 value=0.2 />
      <ControlIn id=control x=-350 y=-100 />
      <AudioParam id=pitch x=-350 y=0 />
      <AudioParam id=vol x=-350 y=100 />
      <AudioOut id=out x=350 y=0 />
      <Delay id=delay0 x=100 y=100 />
      <Pan id=pan0 x=100 y=-100 />
      <Noise id=noise0 x=-270 y=-280 />
      <LFO id=lfo0 x=-130 y=-270 />
      <LinADSR id=linAdsr0 x=30 y=-250 />
      <SnH id=snh0 x=-200 y=100 />
      <Slew id=slew0 x=140 y=-310 />
      <AudioLink from=vol fromPort=out to=gain1 toPort=inp />
      <AudioLink from=const0 fromPort=out to=gain1 toPort=gain />
      <AudioLink from=pitch fromPort=out to=osc0 toPort=pitch />
      <AudioLink from=osc0 fromPort=out to=adsr0 toPort=inp />
      <AudioLink from=adsr0 fromPort=out to=gain0 toPort=inp />
      <AudioLink from=gain1 fromPort=out to=gain0 toPort=gain />
      <AudioLink from=gain0 fromPort=out to=out toPort=inp />
      <ControlLink from=control fromPort=out to=adsr0 toPort=control />
    </Synth>
    <FXPatch id=lowpass4 title="4 Lowpass filters" scale=1 tx=0 ty=0>
      <Filter id=filter0 x=-200 y=0 type=lowpass />
      <Filter id=filter1 x=-100 y=0 type=lowpass />
      <Filter id=filter2 x=0 y=0 type=lowpass />
      <Filter id=filter3 x=100 y=0 type=lowpass />
      <AudioIn id=inp x=-350 y=0 kind=audio />
      <AudioParam id=freq x=-250 y=-150 kind=audio />
      <AudioParam id=Q x=-250 y=150 kind=audio />
      <AudioOut id=out x=350 y=0 kind=audio />
      <AudioLink from=inp fromPort=out to=filter0 toPort=inp />
      <AudioLink from=filter0 fromPort=out to=filter1 toPort=inp />
      <AudioLink from=filter1 fromPort=out to=filter2 toPort=inp />
      <AudioLink from=filter2 fromPort=out to=filter3 toPort=inp />
      <AudioLink from=filter3 fromPort=out to=out toPort=inp />
      <AudioLink from=freq fromPort=out to=filter0 toPort=freq />
      <AudioLink from=freq fromPort=out to=filter1 toPort=freq />
      <AudioLink from=freq fromPort=out to=filter2 toPort=freq />
      <AudioLink from=freq fromPort=out to=filter3 toPort=freq />
      <AudioLink from=Q fromPort=out to=filter0 toPort=Q />
      <AudioLink from=Q fromPort=out to=filter1 toPort=Q />
      <AudioLink from=Q fromPort=out to=filter2 toPort=Q />
      <AudioLink from=Q fromPort=out to=filter3 toPort=Q />
    </FXPatch>
    <MainPatch id=main title=Test tx=0 ty=0 scale=1>
      <Channel id=channel1 x=-320 y=-240 />
      <Channel id=channel2 x=-200 y=-50 />
      <Channel id=channel3 x=-200 y=50 />
      <Channel id=channel4 x=-200 y=150 />
      <Gain id=masterVolume x=170 y=20 />
      <AudioOut id=out x=350 y=0 />
      <AudioLink from=channel1 fromPort=out to=masterVolume toPort=inp />
      <AudioLink from=channel2 fromPort=out to=masterVolume toPort=inp />
      <AudioLink from=channel3 fromPort=out to=masterVolume toPort=inp />
      <AudioLink from=channel4 fromPort=out to=masterVolume toPort=inp />
      <AudioLink from=masterVolume fromPort=out to=out toPort=inp />
      <Delay id=delay0 x=-80 y=-310 delayTime="0.4" />
      <AudioLink from=channel1 fromPort=out to=delay0 toPort=inp />
      <Gain id=gain0 gain="0.2" x=50 y=-310 />
      <AudioLink from=delay0 fromPort=out to=gain0 toPort=inp />
      <Pan id=pan0 x=210 y=-320 pan="-1" />
      <AudioLink from=gain0 fromPort=out to=pan0 toPort=inp />
      <AudioLink from=pan0 fromPort=out to=masterVolume toPort=inp />
      <Delay id=delay1 x=-90 y=-170 delayTime="0.4" />
      <AudioLink from=gain0 fromPort=out to=delay1 toPort=inp />
      <Pan id=pan1 x=210 y=-170 pan=1 />
      <AudioLink from=pan1 fromPort=out to=masterVolume toPort=inp />
      <Gain id=gain1 gain="0.2" x=60 y=-170 />
      <AudioLink from=delay1 fromPort=out to=gain1 toPort=inp />
      <AudioLink from=gain1 fromPort=out to=delay0 toPort=inp />
      <AudioLink from=gain1 fromPort=out to=pan1 toPort=inp />
    </MainPatch>
    <Synth id=fmsynth0 tx=-1 ty=-15 scale=1.0000000000000002>
      <ControlIn id=control x=-320 y=-320 />
      <AudioParam id=pitch x=-350 y=0 />
      <AudioParam id=vol x=-350 y=100 />
      <AudioOut id=out x=350 y=0 />
      <Osc id=osc0 x=-150 y=0 type=sine />
      <ADSR id=adsr0 x=0 y=0 a=0.5 d=0.3 s="0.6" r=0.5 />
      <Gain id=gain0 x=150 y=0 gain=0 />
      <AudioLink from=vol fromPort=out to=gain0 toPort=gain />
      <AudioLink from=pitch fromPort=out to=osc0 toPort=pitch />
      <AudioLink from=osc0 fromPort=out to=adsr0 toPort=inp />
      <AudioLink from=adsr0 fromPort=out to=gain0 toPort=inp />
      <AudioLink from=gain0 fromPort=out to=out toPort=inp />
      <ControlLink from=control fromPort=out to=adsr0 toPort=control />
      <ADSR id=adsr1 a=0.1 d=1 s=0 r=1 x=-40 y=-290 />
      <Osc id=osc1 x=-190 y=-170 type=triangle />
      <ControlLink from=control fromPort=out to=adsr1 toPort=control />
      <Gain id=gain1 gain=1 x=-310 y=-110 />
      <AudioLink from=osc1 fromPort=out to=adsr1 toPort=inp />
      <Gain id=gain2 gain=1000 x=70 y=-270 />
      <AudioLink from=adsr1 fromPort=out to=gain2 toPort=inp />
      <AudioLink from=gain2 fromPort=out to=osc0 toPort=frequency />
      <AudioLink from=pitch fromPort=out to=gain1 toPort=inp />
      <AudioLink from=gain1 fromPort=out to=osc1 toPort=pitch />
      <Const id=const0 value="-2" x=-330 y=-230 />
      <AudioLink from=const0 fromPort=out to=osc1 toPort=pitch />
    </Synth>
  </patches>
  <songs>
    <Song title="test song" currentPattern=0>
      <Instrument x=0 patch=synth0 />
      <Channel x=0 channelId=channel1 />
      <Channel x=1 channelId=channel2 />
      <Channel x=2 channelId=channel3 />
      <Channel x=3 channelId=channel4 />
      <Pattern x=0 length=64>
        <r x=0>
          <c x=0 d=c50080xFF />
        </r>
        <r x=1>
          <c x=1 d=C50080xFF />
        </r>
      </Pattern>
    </Song>
  </songs>
</Project>